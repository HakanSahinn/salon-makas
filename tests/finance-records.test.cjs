const assert = require('node:assert/strict');
const fs = require('node:fs');

const test = require('node:test');
const { transformSync } = require('@babel/core');

const { setup } = require('./helpers.cjs');

const appointment = { id: 'paid', date: '2026-11-17', time: '09:00', status: 'tamamlandi', earnedKurus: 25000, earningsDate: '2026-11-17' };

test('legacy totals migrate once with linked income and unallocated remainder', async () => {
  const fixture = setup({
    appointments: [appointment],
    dailyEarnings: { '2026-11-17': 40000, '2026-10-03': 9900 },
    monthlyExpenses: { '2026-10': { rent: 50000 }, '2026-11': { supplies: 2000 } },
  });
  const store = fixture.restart();
  await store.persist.rehydrate();
  const records = await store.getState().readFinancialRecords(store.getState().recordMonths);
  assert.equal(records.length, 5);
  assert.equal(records.find((item) => item.appointmentId === 'paid').amountKurus, 25000);
  assert.equal(records.find((item) => item.id === 'legacy-income:2026-11-17').amountKurus, 15000);
  await store.getState().updateFinancialRecord('appointment:paid', 20000);
  assert.equal(store.getState().dailyEarnings['2026-11-17'], 35000);
  assert.equal(store.getState().appointments[0].earnedKurus, 20000);
  const restarted = fixture.restart();
  await restarted.persist.rehydrate();
  assert.equal((await restarted.getState().readFinancialRecords(restarted.getState().recordMonths)).length, 5);
  assert.equal(restarted.getState().dailyEarnings['2026-11-17'], 35000);
});

test('income editing works after appointment cleanup and deletion is counted once', async () => {
  const fixture = setup({ appointments: [{ ...appointment, date: '2026-11-16', earningsDate: '2026-11-16' }], dailyEarnings: { '2026-11-16': 25000 } });
  const store = fixture.restart();
  await store.persist.rehydrate();
  await store.getState().removePastAppointments('2026-11-17');
  await store.getState().updateFinancialRecord('appointment:paid', 15000);
  assert.equal(store.getState().dailyEarnings['2026-11-16'], 15000);
  assert.deepEqual(await Promise.all([
    store.getState().deleteFinancialRecord('appointment:paid'),
    store.getState().deleteFinancialRecord('appointment:paid'),
  ]), [true, false]);
  assert.deepEqual(store.getState().dailyEarnings, {});
  assert.deepEqual(store.getState().appointments, []);
});

test('expense category correction and historical category removal recalculate totals', async () => {
  const fixture = setup({ monthlyExpenses: { '2026-10': { rent: 10000, tax: 5000 } } });
  const store = fixture.restart();
  await store.persist.rehydrate();
  await store.getState().updateFinancialRecord('legacy-expense:2026-10:rent', 2500, 'supplies');
  assert.deepEqual(store.getState().monthlyExpenses, { '2026-10': { supplies: 2500, tax: 5000 } });
  await store.getState().deleteFinancialRecord('legacy-expense:2026-10:tax');
  assert.deepEqual(store.getState().monthlyExpenses, { '2026-10': { supplies: 2500 } });
  const restarted = fixture.restart();
  await restarted.persist.rehydrate();
  assert.deepEqual(restarted.getState().monthlyExpenses, store.getState().monthlyExpenses);
});

test('failed corrections preserve all totals and retry only applies the difference once', async () => {
  const fixture = setup({ dailyEarnings: { '2026-11-17': 10000 } });
  const store = fixture.restart();
  await store.persist.rehydrate();
  fixture.storage.failNext = true;
  await assert.rejects(store.getState().updateFinancialRecord('legacy-income:2026-11-17', 20000));
  assert.equal(store.getState().dailyEarnings['2026-11-17'], 10000);
  await store.getState().updateFinancialRecord('legacy-income:2026-11-17', 20000);
  assert.equal(store.getState().dailyEarnings['2026-11-17'], 20000);
  fixture.storage.failNext = true;
  await assert.rejects(store.getState().deleteFinancialRecord('legacy-income:2026-11-17'));
  assert.equal(store.getState().dailyEarnings['2026-11-17'], 20000);
});

test('skipped income can be entered later and deleting it preserves completed status', async () => {
  const fixture = setup({ appointments: [{ ...appointment, status: 'bekliyor', earnedKurus: undefined, earningsDate: undefined }] });
  const store = fixture.restart();
  await store.persist.rehydrate();
  await store.getState().completeAppointment('paid');
  const record = store.getState().financialRecords[0];
  assert.equal(record.amountKurus, null);
  await store.getState().updateFinancialRecord(record.id, 12550);
  assert.equal(store.getState().dailyEarnings['2026-11-17'], 12550);
  await store.getState().deleteFinancialRecord(record.id);
  assert.equal(store.getState().appointments[0].status, 'tamamlandi');
  assert.equal(store.getState().appointments[0].earnedKurus, undefined);
  assert.deepEqual(store.getState().dailyEarnings, {});
});

test('invalid edits leave records and totals unchanged', async () => {
  const fixture = setup({ monthlyExpenses: { '2026-11': { tax: 5000 } } });
  const store = fixture.restart();
  await store.persist.rehydrate();
  for (const [id, amount, category] of [
    ['missing', 100, 'tax'], ['legacy-expense:2026-11:tax', 0, 'tax'],
    ['legacy-expense:2026-11:tax', -1, 'tax'], ['legacy-expense:2026-11:tax', 100, 'invalid'],
  ]) {
    assert.equal(await store.getState().updateFinancialRecord(id, amount, category), false);
  }
  assert.deepEqual(store.getState().monthlyExpenses, { '2026-11': { tax: 5000 } });
});

test('corrected income updates daily weekly monthly profit and keeps skipped historical months accessible', () => {
  const code = transformSync(fs.readFileSync('src/earnings.js', 'utf8'), {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  const dates = {
    localDate: (date) => [
      date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0'),
    ].join('-'),
  };
  new Function('module', 'exports', 'require', code)(module, module.exports, () => dates);
  const { earningsSummary, monthlyFinances } = module.exports;
  const totals = earningsSummary({ '2026-11-17': 20000, '2026-11-16': 10000, '2026-11-01': 5000 }, '2026-11-17');
  assert.equal(totals.today, 20000);
  assert.equal(totals.week, 30000);
  assert.equal(totals.month, 35000);
  const finances = monthlyFinances(totals, { '2026-11': { rent: 15000 } }, '2026-11-17', [
    { date: '2026-10-12', amountKurus: null, type: 'income' },
  ]);
  assert.equal(finances.current.profit, 20000);
  assert.deepEqual(finances.previous, [{ month: '2026-10', income: 0, expense: 0, profit: 0 }]);
});

