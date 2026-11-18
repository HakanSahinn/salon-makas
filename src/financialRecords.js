export function migrateFinancialRecords(state) {
  if (Array.isArray(state.financialRecords)) return state;
  const financialRecords = [];
  const linkedAppointments = new Set();

  for (const [date, amount] of Object.entries(state.dailyEarnings)) {
    const linked = state.appointments.filter((item) =>
      item.earningsDate === date && Number.isSafeInteger(item.earnedKurus) && item.earnedKurus >= 0,
    );
    const linkedTotal = linked.reduce((sum, item) => sum + item.earnedKurus, 0);
    if (linkedTotal <= amount) {
      for (const item of linked) {
        financialRecords.push({
          id: `appointment:${item.id}`, type: 'income', date,
          amountKurus: item.earnedKurus, appointmentId: item.id,
        });
        linkedAppointments.add(item.id);
      }
    }
    const remainder = amount - (linkedTotal <= amount ? linkedTotal : 0);
    if (remainder > 0 || linked.length === 0) {
      financialRecords.push({
        id: `legacy-income:${date}`, type: 'income', date, amountKurus: remainder, legacy: true,
      });
    }
  }

  for (const item of state.appointments) {
    if (item.status === 'tamamlandi' && item.earnedKurus == null && !linkedAppointments.has(item.id)) {
      financialRecords.push({
        id: `appointment:${item.id}`, type: 'income', date: item.date,
        amountKurus: null, appointmentId: item.id,
      });
    }
  }
  for (const [month, categories] of Object.entries(state.monthlyExpenses)) {
    for (const [category, amountKurus] of Object.entries(categories)) {
      financialRecords.push({
        id: `legacy-expense:${month}:${category}`, type: 'expense',
        date: `${month}-01`, category, amountKurus, legacy: true,
      });
    }
  }
  return { ...state, financialRecords };
}

export function financialUpdate(financialRecords, appointments) {
  const dailyEarnings = {};
  const monthlyExpenses = {};
  const linked = new Map();
  for (const record of financialRecords) {
    if (record.type === 'income' && record.appointmentId) linked.set(record.appointmentId, record);
    if (record.amountKurus == null) continue;
    if (record.type === 'income') {
      const total = (dailyEarnings[record.date] ?? 0) + record.amountKurus;
      if (!Number.isSafeInteger(total)) return null;
      dailyEarnings[record.date] = total;
    } else {
      const month = record.date.slice(0, 7);
      const categories = monthlyExpenses[month] ?? {};
      categories[record.category] = (categories[record.category] ?? 0) + record.amountKurus;
      const total = Object.values(categories).reduce((sum, value) => sum + value, 0);
      if (!Number.isSafeInteger(total)) return null;
      monthlyExpenses[month] = categories;
    }
  }
  return {
    financialRecords, dailyEarnings, monthlyExpenses,
    appointments: appointments.map((appointment) => {
      if (appointment.status !== 'tamamlandi') return appointment;
      const record = linked.get(appointment.id);
      const { earnedKurus: previousAmount, earningsDate: previousDate, ...details } = appointment;
      if (record?.amountKurus == null) return details;
      return { ...details, earnedKurus: record.amountKurus, earningsDate: record.date };
    }),
  };
}

export function financialRecordTitle(record) {
  if (record.type === 'expense') return record.legacy ? 'Eski aylık gider toplamı' : 'Gider';
  return record.legacy ? 'Eski günlük gelir toplamı' : 'Randevu geliri';
}
