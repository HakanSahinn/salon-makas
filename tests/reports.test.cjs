const test = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers.cjs');
const { reportRange, financialReport } = setup().load('src/reports.js');
const today = '2026-11-17';

test('Report weeks begin Monday, respect the current-year retention boundary and stop at today', () => {
  assert.deepEqual(reportRange('week', today, today), { start: '2026-11-16', end: today });
  assert.deepEqual(reportRange('week', '2026-01-01', today), { start: '2026-01-01', end: '2026-01-04' });
});

test('Month supports leap February and historical August; annual includes the selected entire year up to today', () => {
  assert.deepEqual(reportRange('month', '2024-02-10', today), { start: '2024-02-01', end: '2024-02-29' });
  assert.deepEqual(reportRange('month', '2026-08-01', today), { start: '2026-08-01', end: '2026-08-31' });
  assert.deepEqual(reportRange('year', today, today), { start: '2026-01-01', end: today });
  assert.deepEqual(reportRange('year', '2025-08-23', today), { start: '2025-01-01', end: '2025-12-31' });
  assert.deepEqual(reportRange('custom', today, today, '2026-08-14', '2026-12-31'), { start: '2026-08-14', end: today });
});

test('Report totals include boundaries, categories and skipped incomes without mutating records', () => {
  const records = [
    { id: 'a', type: 'income', date: '2026-08-01', amountKurus: 10000 },
    { id: 'b', type: 'expense', date: '2026-08-31', category: 'rent', amountKurus: 12000 },
    { id: 'c', type: 'income', date: '2026-08-19', amountKurus: null },
    { id: 'd', type: 'income', date: '2026-09-01', amountKurus: 9999 },
  ];
  const before = JSON.stringify(records);
  const report = financialReport(records, reportRange('month', '2026-08-01', today), today);
  assert.equal(report.income, 10000);
  assert.equal(report.expense, 12000);
  assert.equal(report.profit, -2000);
  assert.equal(report.categories.rent, 12000);
  assert.equal(report.skipped, 1);
  assert.equal(report.rows.length, 3);
  assert.equal(JSON.stringify(records), before);
});

test('Legacy expenses belong to their month and year and never appear in weekly or custom reports', () => {
  const records = [{ id: 'old', type: 'expense', date: '2026-08-01', category: 'rent', amountKurus: 8000, legacy: true }];
  const partial = financialReport(records, { start: '2026-08-01', end: '2026-08-17' }, today, 'custom');
  assert.equal(partial.expense, 0);
  assert.equal(partial.rows.length, 0);
  const monthly = financialReport(records, reportRange('month', '2026-08-01', today), today);
  assert.equal(monthly.expense, 8000);

  const yearly = financialReport(records, reportRange('year', today, today), today, 'year');
  assert.equal(yearly.expense, 8000);
});

test('Expenses are grouped by creation month and year, including later days of historical months', () => {
  const records = [
    { id: 'a', type: 'expense', date: '2026-08-29', category: 'rent', amountKurus: 1000 },
    { id: 'b', type: 'expense', date: '2026-11-17', category: 'tax', amountKurus: 2000 },
    { id: 'c', type: 'expense', date: '2025-12-31', category: 'tax', amountKurus: 4000 },
    { id: 'd', type: 'income', date: '2026-08-20', amountKurus: 5000 },
  ];
  const month = financialReport(records, reportRange('month', '2026-08-01', today), today, 'month');
  assert.equal(month.expense, 1000);
  const year = financialReport(records, reportRange('year', '2026-08-01', today), today, 'year');
  assert.equal(year.expense, 3000);
  assert.equal(year.income, 5000);
  assert.equal(year.profit, 2000);
  for (const period of ['week', 'custom']) {
    const result = financialReport(records, { start: '2025-01-01', end: today }, today, period);
    assert.equal(result.expense, 0);
    assert.equal(result.rows.some(row => row.type === 'expense'), false);
  }
});
