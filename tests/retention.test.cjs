const test = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers.cjs');

const appointment = { id: 'future', customerName: 'Future', date: '2027-02-01', time: '10:00', status: 'bekliyor' };

test('upgrade retains current-year details, previous-year totals only, and future appointments', async () => {
  const fixture = setup({ appointments: [appointment], dailyEarnings: { '2024-07-01': 300, '2025-08-02': 500, '2026-11-17': 1000 },
    monthlyExpenses: { '2024-07': { rent: 100 }, '2025-08': { tax: 200 }, '2026-11': { supplies: 250 } } });
  const store = fixture.restart();
  await store.persist.rehydrate();
  assert.equal(store.persist.hasHydrated(), true);
  assert.deepEqual(store.getState().dailyEarnings, { '2026-11-17': 1000 });
  assert.deepEqual(store.getState().summaryMonths, { '2025-08': { income: 500, expense: 200 } });
  assert.deepEqual(store.getState().recordMonths, ['2026-11']);
  assert.equal(store.getState().appointments[0].id, 'future');
  const raw = JSON.parse(fixture.files.get(JSON.parse(fixture.pointer()).current.name));
  assert.equal(Object.hasOwn(raw, 'financialRecords'), false);
  assert.equal([...fixture.files.keys()].some(name => /month-202[45]/.test(name)), false);
  assert.equal(await fixture.fileIO.getLegacy(), null);
});

test('new-year rollover removes physical detail files and keeps exact previous monthly totals', async () => {
  const fixture = setup({ appointments: [appointment], dailyEarnings: { '2025-08-01': 100, '2026-11-17': 1000, '2026-10-03': 2000 }, monthlyExpenses: { '2026-11': { rent: 300 } } });
  const store = fixture.restart();
  await store.persist.rehydrate();
  fixture.setToday('2027-01-01');
  await assert.rejects(store.getState().maintainCalendar(), /Telefon tarihinde/);
  store.getState().confirmCalendarDate();
  await store.getState().maintainCalendar();
  assert.deepEqual(store.getState().dailyEarnings, {});
  assert.deepEqual(store.getState().recordMonths, []);
  assert.deepEqual(store.getState().summaryMonths, { '2026-11': { income: 1000, expense: 300 }, '2026-10': { income: 2000, expense: 0 } });
  assert.equal([...fixture.files.keys()].some(name => name.startsWith('month-2026-')), false);
  assert.equal(store.getState().appointments.length, 1);
  const reopened = fixture.restart();
  await reopened.persist.rehydrate();
  assert.deepEqual(reopened.getState().summaryMonths, store.getState().summaryMonths);
  assert.equal(reopened.getState().retentionYear, 2027);
});

test('the next rollover forgets the older summary and archived entries cannot be edited', async () => {
  const fixture = setup({ dailyEarnings: { '2025-01-01': 10, '2026-11-17': 1000 } });
  const store = fixture.restart();
  await store.persist.rehydrate();
  assert.equal(await store.getState().updateFinancialRecord('legacy-income:2025-01-01', 300, undefined, '2025-01'), false);
  fixture.setToday('2028-01-01');
  store.getState().confirmCalendarDate();
  await store.getState().maintainCalendar();
  assert.deepEqual(store.getState().summaryMonths, {});
  assert.equal(store.getState().retentionYear, 2028);
  assert.equal([...fixture.files.keys()].some(name => name.startsWith('month-')), false);
});

test('lost pointer never creates an empty archive; local recovery restores the existing data', async () => {
  const fixture = setup({ dailyEarnings: { '2026-11-17': 45000 } });
  const store = fixture.restart();
  await store.persist.rehydrate();
  const before = fixture.disk();
  const getPointer = fixture.fileIO.getPointer;
  fixture.fileIO.getPointer = async () => null;
  const reopened = fixture.restart();
  await reopened.persist.rehydrate();
  assert.equal(reopened.persist.hasHydrated(), false);
  assert.deepEqual(fixture.disk(), before);
  await reopened.getState().recoverLocal();
  fixture.fileIO.getPointer = getPointer;
  await reopened.persist.rehydrate();
  assert.equal(reopened.persist.hasHydrated(), true);
  assert.deepEqual(reopened.getState().dailyEarnings, { '2026-11-17': 45000 });
});

test('retention activation failure leaves both the current view and on-disk ledger unchanged', async () => {
  const fixture = setup({ dailyEarnings: { '2026-11-17': 1000 } });
  const store = fixture.restart();
  await store.persist.rehydrate();
  const before = fixture.disk();
  fixture.setToday('2027-01-01');
  store.getState().confirmCalendarDate();
  fixture.storage.failNext = true;
  await assert.rejects(store.getState().maintainCalendar());
  assert.deepEqual(fixture.disk(), before);
  assert.deepEqual(store.getState().dailyEarnings, before.dailyEarnings);
  await store.getState().maintainCalendar();
  assert.deepEqual(store.getState().summaryMonths, { '2026-11': { income: 1000, expense: 0 } });
});

test('previous-year reports have totals only; current-year reports remain paged and exclude weekly expenses', async () => {
  const normalize = setup().load('src/financialRecords.js').financialUpdate;
  const records = Array.from({ length: 250 }, (_, i) => ({ id: `record-${i}`, type: 'income', date: '2026-11-17', amountKurus: 100 }));
  records.push({ id: 'previous-income', type: 'income', date: '2025-08-01', amountKurus: 5000 });
  records.push({ id: 'previous-expense', type: 'expense', category: 'rent', date: '2025-08-20', amountKurus: 2000 });
  const fixture = setup(normalize(records, []));
  const store = fixture.restart();
  await store.persist.rehydrate();
  const old = await store.getState().readFinancialReport({ range: { start: '2025-08-01', end: '2025-08-31' }, today: '2026-11-17', period: 'month' });
  assert.equal(old.income, 5000);
  assert.equal(old.expense, 2000);
  assert.equal(old.profit, 3000);
  assert.equal(old.summaryOnly, true);
  assert.deepEqual(old.rows, []);
  assert.deepEqual(old.categories, {});
  await assert.rejects(store.getState().readFinancialReport({ range: { start: '2025-08-01', end: '2025-08-05' }, today: '2026-11-17', period: 'week' }));
  const query = { range: { start: '2026-11-16', end: '2026-11-17' }, today: '2026-11-17', period: 'week' };
  const first = await store.getState().readFinancialReport(query);
  const next = await store.getState().readFinancialReport({ ...query, cursor: first.nextCursor });
  assert.equal(first.rows.length, 100);
  assert.equal(first.income, 25000);
  assert.equal(first.rows.some(r => next.rows.some(other => other.id === r.id)), false);
});

test('backdated year is rejected and all backup/restore actions have been removed', async () => {
  const fixture = setup();
  const store = fixture.restart();
  await store.persist.rehydrate();
  fixture.setToday('2025-12-31');
  await assert.rejects(store.getState().maintainCalendar(), /Telefon tarihi/);
  assert.equal(Object.keys(store.getState()).some(key => /backup|restore|checkpoint/i.test(key)), false);
});
