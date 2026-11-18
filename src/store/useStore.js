import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isValidDate, localDate } from '../dates';
import { expenseCategories } from '../earnings';
import { financialUpdate } from '../financialRecords';
import { ValidationError, validateAppointmentSlot } from '../validation';
import { createCommit, hydrationStorage, persistedData, storageName } from './commitStorage';

export const useStore = /** @type {import('../types').SalonBoundStore} */ (/** @type {unknown} */ (create(
  persist(
    (set, get) => {
      const commit = createCommit(set, get);
      return {
        appointments: [],
        dailyEarnings: {},
        monthlyExpenses: {},
        financialRecords: [],
        recordMonths: [],
        archiveRevision: 0,
        readFinancialRecords: (months) => commit.read(months),
        readFinancialReport: (query, cancelled) => commit.report(query, cancelled),
        summaryMonths: {},
        retentionYear: 0,
        maintainCalendar: () => commit.maintain(),
        recoverLocal: () => commit.recover(),
        confirmCalendarDate: () => commit.confirmDate(),
        addExpense: (category, amount) => commit.month(localDate().slice(0, 7), ({ appointments, financialRecords }) => {
          if (!Object.hasOwn(expenseCategories, category) || !Number.isSafeInteger(amount) || amount <= 0) {
            return null;
          }

          return financialUpdate([
            ...financialRecords,
            { id: randomUUID(), type: 'expense', date: localDate(), category, amountKurus: amount },
          ], appointments);
        }),
        updateFinancialRecord: (id, amountKurus, category, month) => commit.month(id, ({ appointments, financialRecords }) => {
          const record = financialRecords.find((item) => item.id === id);
          if (!record || !Number.isSafeInteger(amountKurus) || amountKurus < 0) return null;
          if (record.type === 'expense' && (amountKurus === 0 || !Object.hasOwn(expenseCategories, category))) {
            return null;
          }
          return financialUpdate(financialRecords.map((item) => {
            if (item.id !== id) return item;
            return item.type === 'expense' ? { ...item, amountKurus, category } : { ...item, amountKurus };
          }), appointments);
        }, month),
        deleteFinancialRecord: (id, month) => commit.month(id, ({ appointments, financialRecords }) => {
          if (!financialRecords.some((record) => record.id === id)) return null;
          return financialUpdate(financialRecords.filter((record) => record.id !== id), appointments);
        }, month),
        addAppointment: (input) =>
          commit(({ appointments }) => {
            if (!input.customerName?.trim()) throw new ValidationError('Müşteri adını gir.');
            if (input.customerName.trim().length > 80) throw new ValidationError('Müşteri adı en fazla 80 karakter olabilir.');
            validateAppointmentSlot(appointments, input.date, input.time);
            return {
              appointments: [
                ...appointments,
                { ...input, id: randomUUID(), status: 'bekliyor' },
              ],
            };
          }),
        completeAppointment: (id, earnedKurus = null) => commit.month(localDate().slice(0, 7), ({ appointments, financialRecords }) => {
          const earningsDate = localDate();
          const appointment = appointments.find((item) => item.id === id);
          if (appointment?.status !== 'bekliyor' || appointment.date < earningsDate) {
            return null;
          }
          if (appointment.date !== earningsDate) throw new ValidationError('Yalnızca bugünün randevusu tamamlanabilir.');

          if (earnedKurus !== null && (!Number.isSafeInteger(earnedKurus) || earnedKurus < 0)) return null;
          return financialUpdate([
            ...financialRecords,
            { id: randomUUID(), type: 'income', date: earningsDate, amountKurus: earnedKurus, appointmentId: id },
          ], appointments.map((item) => item.id === id ? { ...item, status: 'tamamlandi' } : item));
        }),
        rescheduleAppointment: (id, date, time) => commit(({ appointments }) => {
          const appointment = appointments.find((item) => item.id === id);
          const today = localDate();
          if (!appointment || appointment.date < today || date < today || !isValidDate(date)) {
            return null;
          }
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
          validateAppointmentSlot(appointments, date, time, id);

          return {
            appointments: appointments.map((item) =>
              item.id === id ? { ...item, date, time } : item,
            ),
          };
        }),
        deleteAppointment: (id) =>
          commit(({ appointments }) => ({
            appointments: appointments.filter((appointment) => appointment.id !== id),
          })),
        removePastAppointments: (today) => commit(({ appointments }) => {
          const kept = appointments.filter((appointment) => appointment.date >= today);
          if (kept.length !== appointments.length) return { appointments: kept };
          return null;
        }),
      };
    },
    {
      name: storageName,
      storage: hydrationStorage,
      partialize: persistedData,
      merge: (saved, current) => ({ ...current, .../** @type {Partial<import('../types').SalonState>} */ (saved) }),
      skipHydration: true,
    },
  ),
)));
