const assert = require('node:assert/strict');
const test = require('node:test');
const { setup } = require('./helpers.cjs');

const appointment = {
  id: 'existing', date: '2026-11-17', time: '09:00', status: 'bekliyor', customerName: 'Test',
};

test('concurrent reservations cannot occupy the same slot', async () => {
  const fixture = setup();
  const store = fixture.restart();
  await store.persist.rehydrate();
  const results = await Promise.allSettled([
    store.getState().addAppointment(appointment),
    store.getState().addAppointment({ ...appointment, customerName: 'Other' }),
  ]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.match(results[1].reason.message, /başka bir randevu/);
  assert.equal(store.getState().appointments.length, 1);
});

test('editing excludes itself and rejects an occupied destination', async () => {
  const fixture = setup({ appointments: [appointment, { ...appointment, id: 'other', time: '09:30' }] });
  const store = fixture.restart();
  await store.persist.rehydrate();
  assert.equal(await store.getState().rescheduleAppointment('existing', appointment.date, appointment.time), true);
  await assert.rejects(store.getState().rescheduleAppointment('existing', appointment.date, '09:30'));
  assert.equal(store.getState().appointments[0].time, '09:00');
});

test('tomorrow cannot be completed today and legacy minute values remain editable', async () => {
  const fixture = setup({ appointments: [{ ...appointment, date: '2026-11-18', time: '09:03' }] });
  const store = fixture.restart();
  await store.persist.rehydrate();
  await assert.rejects(store.getState().completeAppointment('existing', 1000));
  assert.deepEqual(store.getState().dailyEarnings, {});
  assert.equal(await store.getState().rescheduleAppointment('existing', '2026-11-17', '09:03'), true);
  await assert.rejects(store.getState().rescheduleAppointment('existing', '2026-11-17', '09:04'));
});

