import { localDate } from './dates';

export function reportRange(period, selectedDate, today, customStart = selectedDate, customEnd = selectedDate) {
  let start = selectedDate;
  let end = selectedDate;
  const date = new Date(`${selectedDate}T12:00:00`);
  if (period === 'week') {
    date.setDate(date.getDate() - (date.getDay() + 6) % 7);
    start = localDate(date);
    date.setDate(date.getDate() + 6);
    end = localDate(date);
  } else if (period === 'month') {
    start = `${selectedDate.slice(0, 7)}-01`;
    date.setMonth(date.getMonth() + 1, 0);
    end = localDate(date);
  } else if (period === 'year') {
    start = `${selectedDate.slice(0, 4)}-01-01`;
    end = `${selectedDate.slice(0, 4)}-12-31`;
  } else {
    start = customStart;
    end = customEnd;
  }
  if (period === 'week' && start < selectedDate.slice(0, 4) + '-01-01') start = selectedDate.slice(0, 4) + '-01-01';
  return { start, end: end > today ? today : end };
}

export function financialReport(records, range, today = localDate(), period = 'month') {
  const categories = {};
  const rows = [];
  let income = 0;
  let expense = 0;
  let skipped = 0;
  if (range.start > range.end) return { income, expense, profit: 0, categories, rows, skipped };
  for (const record of records) {
    if (record.type === 'expense') {
      if (period !== 'month' && period !== 'year') continue;
      const length = period === 'month' ? 7 : 4;
      if (record.date.slice(0, length) !== range.start.slice(0, length) || record.date > today) continue;
    } else if (record.date < range.start || record.date > range.end) continue;
    rows.push(record);
    if (record.amountKurus == null) {
      skipped += 1;
    } else if (record.type === 'income') {
      income += record.amountKurus;
    } else {
      expense += record.amountKurus;
      categories[record.category] = (categories[record.category] ?? 0) + record.amountKurus;
    }
  }
  rows.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return { income, expense, profit: income - expense, categories, rows, skipped };
}
