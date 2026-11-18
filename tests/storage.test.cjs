const assert = require('node:assert/strict');


const test = require('node:test');


const { setup } = require('./helpers.cjs');

const appointment = {
  id: 'existing', customerName: 'Test', date: '2026-11-17', time: '09:00', status: 'bekliyor',
};

test('state stays unchanged until storage confirms the write', async () => {
  const fixture = setup();
  const store = fixture.restart();
  await store.persist.rehydrate();
  let release;
  fixture.storage.gate = new Promise((resolve) => { release = resolve; });
  const operation = store.getState().addAppointment(appointment);
  await new Promise(setImmediate);
  assert.equal(store.getState().appointments.length, 0);
  release();
  assert.equal(await operation, true);
  assert.equal(store.getState().appointments.length, 1);
  assert.deepEqual(fixture.disk().appointments, store.getState().appointments);
});

test('failed income write can retry without completing or counting twice', async () => {
  const fixture = setup({ appointments: [appointment] });
  const store = fixture.restart();
  await store.persist.rehydrate();
  fixture.storage.failNext = true;
  await assert.rejects(store.getState().completeAppointment('existing', 25050));
  assert.equal(store.getState().appointments[0].status, 'bekliyor');
  assert.deepEqual(store.getState().dailyEarnings, {});
  assert.equal(await store.getState().completeAppointment('existing', 25050), true);
  assert.equal(await store.getState().completeAppointment('existing', 25050), false);
  assert.deepEqual(fixture.disk().dailyEarnings, { '2026-11-17': 25050 });
});

test('expenses survive failures and queued writes preserve all totals', async () => {
  const fixture = setup();
  const store = fixture.restart();
  await store.persist.rehydrate();
  fixture.storage.failNext = true;
  const outcomes = await Promise.allSettled([
    store.getState().addExpense('rent', 10000),
    store.getState().addExpense('supplies', 500),
  ]);
  assert.equal(outcomes[0].status, 'rejected');
  assert.equal(outcomes[1].status, 'fulfilled');
  assert.deepEqual(fixture.disk().monthlyExpenses, { '2026-11': { supplies: 500 } });
  await store.getState().addExpense('rent', 10000);
  const reopened = fixture.restart();
  await reopened.persist.rehydrate();
  assert.deepEqual(reopened.getState().monthlyExpenses, { '2026-11': { rent: 10000, supplies: 500 } });
});

test('failed creation, editing, deletion and cleanup leave memory and disk unchanged', async () => {
  const fixture = setup({ appointments: [appointment, { ...appointment, id: 'old', date: '2026-11-16' }] });
  const store = fixture.restart();
  await store.persist.rehydrate();
  const before = fixture.disk();
  const operations = [
    () => store.getState().addAppointment(appointment),
    () => store.getState().rescheduleAppointment('existing', '2026-11-18', '09:30'),
    () => store.getState().deleteAppointment('existing'),
    () => { fixture.setToday('2026-11-18'); return store.getState().maintainCalendar(); },
  ];
  for (const operation of operations) {
    fixture.storage.failNext = true;
    await assert.rejects(operation());
    assert.deepEqual(fixture.disk(), before);
    assert.deepEqual(store.getState().appointments, before.appointments);
  }
});

test('completion, deletion and day cleanup serialize without losing income', async () => {
  const fixture = setup({ appointments: [appointment, { ...appointment, id: 'old', date: '2026-11-16' }] });
  const store = fixture.restart();
  await store.persist.rehydrate();
  await Promise.all([
    store.getState().completeAppointment('existing', 999),
    store.getState().removePastAppointments('2026-11-17'),
    store.getState().deleteAppointment('existing'),
  ]);
  const reopened = fixture.restart();
  await reopened.persist.rehydrate();
  assert.deepEqual(reopened.getState().appointments, []);
  assert.deepEqual(reopened.getState().dailyEarnings, { '2026-11-17': 999 });
});

test('skipping and concurrent completion persist exactly once', async () => {
  const fixture = setup({ appointments: [appointment] });
  const store = fixture.restart();
  await store.persist.rehydrate();
  assert.deepEqual(await Promise.all([
    store.getState().completeAppointment('existing'),
    store.getState().completeAppointment('existing', 100),
  ]), [true, false]);
  const reopened = fixture.restart();
  await reopened.persist.rehydrate();
  assert.equal(reopened.getState().appointments[0].status, 'tamamlandi');
  assert.deepEqual(reopened.getState().dailyEarnings, {});
});

