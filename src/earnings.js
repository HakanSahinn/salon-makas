import { localDate } from './dates';

const liraFormat = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const expenseCategories = {
  rent: 'Kira',
  utilities: 'Elektrik, su ve doğalgaz faturası',
  tax: 'Vergi',
  supplies: 'Malzemeler',
  other: 'Diğer giderler',
};

export function parseKurus(input) {
  const match = /^(\d{1,9})(?:[,.](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const [, whole, fraction = ''] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function formatLira(kurus) {
  return `${liraFormat.format(kurus / 100)} TL`;
}

export function earningsByDay(dailyEarnings, today) {
  const month = today.slice(0, 7);
  const lastDay = new Date(`${month}-01T12:00:00`);
  lastDay.setMonth(lastDay.getMonth() + 1, 0);

  return Array.from({ length: lastDay.getDate() }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, '0')}`;
    return { day, date, amount: date <= today ? dailyEarnings[date] ?? 0 : 0 };
  });
}

export function earningsSummary(dailyEarnings, today) {
  const monday = new Date(`${today}T12:00:00`);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const weekStart = localDate(monday);
  const currentMonth = today.slice(0, 7);
  const months = {};
  let week = 0;

  for (const [date, amount] of Object.entries(dailyEarnings)) {
    if (date > today) continue;
    if (date >= weekStart) week += amount;
    const month = date.slice(0, 7);
    months[month] = (months[month] ?? 0) + amount;
  }

  return {
    today: dailyEarnings[today] ?? 0,
    week,
    month: months[currentMonth] ?? 0,
    previousMonths: Object.entries(months)
      .filter(([month]) => month < currentMonth)
      .sort(([first], [second]) => second.localeCompare(first)),
  };
}

export function totalExpenses(categories = {}) {
  return Object.values(categories).reduce((sum, amount) => sum + amount, 0);
}

export function monthlyFinances(totals, monthlyExpenses, today, financialRecords = [], recordMonths = []) {
  const currentMonth = today.slice(0, 7);
  const incomeByMonth = new Map(totals.previousMonths);
  incomeByMonth.set(currentMonth, totals.month);

  function summarize(month) {
    const income = incomeByMonth.get(month) ?? 0;
    const expense = totalExpenses(monthlyExpenses[month]);
    return { month, income, expense, profit: income - expense };
  }

  const historyMonths = new Set([
    ...incomeByMonth.keys(), ...Object.keys(monthlyExpenses),
    ...financialRecords.map((record) => record.date.slice(0, 7)), ...recordMonths,
  ]);
  return {
    current: summarize(currentMonth),
    previous: [...historyMonths].filter((month) => month < currentMonth).sort().reverse().map(summarize),
  };
}
