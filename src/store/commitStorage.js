import { localDate } from '../dates';
import { archiveStorage } from './archiveStorage';

let lastStorageError;
export const getStorageError = () => lastStorageError;
export const storageName = 'berber-randevulari';
export function persistedData({ appointments, dailyEarnings, monthlyExpenses, financialRecords }) {
  return { appointments, dailyEarnings, monthlyExpenses, financialRecords };
}
export const hydrationStorage = {
  async getItem() {
    try { const state = await archiveStorage.load(); lastStorageError = null; return { state, version: 0 }; }
    catch (error) { lastStorageError = error; throw error; }
  },
  setItem: () => {},
  removeItem: () => { throw new Error('Yerel kayıtlar otomatik sıfırlanmaz.'); },
};
export function createCommit(set, get) {
  let pending = Promise.resolve();
  function setView(view) { set({ ...view, archiveRevision: get().archiveRevision + 1 }); }
  function enqueue(task, calendar = true) {
    const operation = pending.then(async () => {
      if (calendar) { const changed = await archiveStorage.maintainCalendar(); if (changed) setView(changed); }
      return task();
    }).catch(async error => {
      try { await archiveStorage.discardOrphans(); } catch { /* Preserve the original failure. */ }
      throw error;
    });
    pending = operation.catch(() => {});
    return operation;
  }
  const commit = change => enqueue(async () => {
    const update = change(get());
    if (!update) return false;
    const saved = await archiveStorage.publish({ ...get(), ...update }, {});
    setView({ ...update, ...saved });
    return true;
  });
  commit.month = (monthOrId, change, hint) => enqueue(async () => {
    const month = /^\d{4}-\d{2}$/.test(monthOrId) ? monthOrId : await archiveStorage.findMonth(monthOrId, hint);
    if (!month) return false;
    const current = get();
    const records = await archiveStorage.readMonths([month]);
    const update = change({ ...current, appointments: current.appointments.filter(a => a.date.startsWith(month)), financialRecords: records });
    if (!update) return false;
    const dailyEarnings = Object.fromEntries(Object.entries(current.dailyEarnings).filter(([date]) => !date.startsWith(month)));
    Object.assign(dailyEarnings, update.dailyEarnings);
    const monthlyExpenses = { ...current.monthlyExpenses };
    delete monthlyExpenses[month];
    Object.assign(monthlyExpenses, update.monthlyExpenses);
    const changed = new Map(update.appointments.map(a => [a.id, a]));
    const state = { ...current, dailyEarnings, monthlyExpenses, appointments: current.appointments.map(a => changed.get(a.id) ?? a) };
    const saved = await archiveStorage.publish(state, { [month]: update.financialRecords });
    setView({ ...saved, financialRecords: month === localDate().slice(0, 7) ? update.financialRecords : current.financialRecords });
    return true;
  });
  commit.read = months => enqueue(() => archiveStorage.readMonths(months));
  commit.report = (query, cancelled) => enqueue(() => archiveStorage.report(query, cancelled));
  commit.maintain = () => enqueue(() => true);
  commit.recover = () => enqueue(() => archiveStorage.recoverLocal(), false);
  commit.confirmDate = () => archiveStorage.confirmDate();
  return commit;
}
