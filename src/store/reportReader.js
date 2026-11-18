import { financialReport } from '../reports';
import { ValidationError } from '../validation';

const pageSize = 100;
const compare = (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id);
function safeAdd(a, b) {
  const value = a + b;
  if (!Number.isSafeInteger(value)) throw new ValidationError('Toplam tutar güvenli hesaplama sınırını aşıyor.');
  return value;
}
export function createReportReader({ getManifest, readChunk }) {
  return async ({ range, today, period, cursor }, cancelled = () => false) => {
    const data = getManifest();
    const rows = [];
    const categories = {};
    let income = 0;
    let expense = 0;
    let skipped = 0;
    let totalRecords = 0;
    const startYear = Number(range.start.slice(0, 4));
    const endYear = Number(range.end.slice(0, 4));
    if (startYear !== data.retentionYear || endYear !== data.retentionYear) {
      if (startYear !== data.retentionYear - 1 || endYear !== startYear || !['month', 'year'].includes(period)) {
        throw new ValidationError('Bu yılın ayrıntıları ve yalnızca geçen yılın aylık/yıllık özetleri görüntülenebilir.');
      }
      for (const [month, amounts] of Object.entries(data.summaryMonths)) {
        if (period === 'year' || month === range.start.slice(0, 7)) {
          income = safeAdd(income, amounts.income);
          expense = safeAdd(expense, amounts.expense);
        }
      }
      return { income, expense, profit: income - expense, categories, skipped, totalRecords, rows, summaryOnly: true, nextCursor: null };
    }
    const months = Object.keys(data.months).filter(m => m >= range.start.slice(0, 7) && m <= range.end.slice(0, 7)).sort().reverse();
    if (range.start <= range.end) for (const month of months) for (const ref of data.months[month].chunks) {
      if (cancelled()) return null;
      const partial = financialReport(await readChunk(ref), range, today, period);
      income = safeAdd(income, partial.income);
      expense = safeAdd(expense, partial.expense);
      skipped += partial.skipped;
      totalRecords += partial.rows.length;
      for (const [key, amount] of Object.entries(partial.categories)) categories[key] = safeAdd(categories[key] ?? 0, amount);
      for (const row of partial.rows) {
        if (cursor && compare(row, cursor) <= 0) continue;
        let low = 0;
        let high = rows.length;
        while (low < high) { const mid = (low + high) >>> 1; if (compare(rows[mid], row) < 0) low = mid + 1; else high = mid; }
        if (low <= pageSize) rows.splice(low, 0, row);
        if (rows.length > pageSize + 1) rows.pop();
      }
    }
    const more = rows.length > pageSize;
    if (more) rows.pop();
    const last = rows.at(-1);
    return { income, expense, profit: income - expense, categories, skipped, totalRecords, rows, summaryOnly: false,
      nextCursor: more && last ? { date: last.date, id: last.id } : null };
  };
}
