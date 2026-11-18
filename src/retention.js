import { ValidationError } from './validation';

export class CalendarDateError extends ValidationError {}
export function checkCalendar(data, today, confirmed = false) {
  const year = Number(today.slice(0, 4));
  if (data.retentionYear > year) throw new ValidationError('Telefon tarihi saklanan yıldan geri. Telefonun tarihini düzeltin.');
  const lastDate = data.lastActiveDate ?? Object.keys(data.dailyEarnings ?? {}).sort().at(-1);
  if (lastDate && (new Date(`${today}T12:00:00`).getTime() - new Date(`${lastDate}T12:00:00`).getTime()) / 86400000 > 32 && !confirmed) {
    throw new CalendarDateError('Telefon tarihinde büyük bir değişiklik var. Eski kayıtları temizlemeden önce tarihi doğrulayın.');
  }
}

export function retainYear(data, today) {
  const year = Number(today.slice(0, 4));
  const previousYear = String(year - 1);
  const summaryMonths = {};
  for (const [month, totals] of Object.entries(data.summaryMonths ?? {})) {
    if (month.startsWith(previousYear + '-')) summaryMonths[month] = { income: totals.income, expense: totals.expense };
  }
  function summary(month) { return summaryMonths[month] ??= { income: 0, expense: 0 }; }
  for (const [date, amount] of Object.entries(data.dailyEarnings ?? {})) {
    if (date.startsWith(previousYear + '-')) summary(date.slice(0, 7)).income += amount;
  }
  for (const [month, categories] of Object.entries(data.monthlyExpenses ?? {})) {
    if (month.startsWith(previousYear + '-')) summary(month).expense += Object.values(categories).reduce((sum, amount) => sum + amount, 0);
  }
  const current = String(year) + '-';
  for (const amounts of Object.values(summaryMonths)) if (!Number.isSafeInteger(amounts.income) || !Number.isSafeInteger(amounts.expense)) throw new ValidationError('Yıllık toplam doğrulanamadı.');
  return { version: 3, retentionYear: year, lastActiveDate: today, summaryMonths,
    appointments: data.appointments.filter(item => item.date >= today),
    dailyEarnings: Object.fromEntries(Object.entries(data.dailyEarnings ?? {}).filter(([date]) => date.startsWith(current))),
    monthlyExpenses: Object.fromEntries(Object.entries(data.monthlyExpenses ?? {}).filter(([month]) => month.startsWith(current))),
    months: Object.fromEntries(Object.entries(data.months ?? {}).filter(([month]) => month.startsWith(current))) };
}
