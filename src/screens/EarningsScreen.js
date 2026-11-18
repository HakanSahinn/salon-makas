import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useToday } from '../dates';
import { earningsByDay, earningsSummary, formatLira, monthlyFinances } from '../earnings';
import { useStore } from '../store/useStore';
import { ActionButton, colors } from '../ui';

const monthFormat = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });

function MonthlyChart({ dailyEarnings, today }) {
  const days = earningsByDay(dailyEarnings, today);
  const peak = Math.max(...days.map(({ amount }) => amount));
  const [axisWidth, setAxisWidth] = useState(0);
  const staggerLabels = axisWidth < days.length * 11;

  return (
    <View style={styles.chart}>
      <View style={styles.chartHeading}>
        <Text accessibilityRole="header" style={styles.heading}>Günlük kazanç</Text>
        <Text style={styles.label}>{monthFormat.format(new Date(`${today}T12:00:00`))}</Text>
      </View>
      <Text style={styles.scale}>{peak > 0 ? `En yüksek gün: ${formatLira(peak)}` : 'Bu ay henüz kazanç yok.'}</Text>
      <View style={styles.plot}>
        <View style={styles.midline} />
        {days.map(({ day, date, amount }) => (
          <View
            key={date}
            style={styles.column}
            accessible={amount > 0}
            accessibilityLabel={amount > 0 ? `Ayın ${day}. günü: ${formatLira(amount)}` : undefined}
          >
            {amount > 0 ? (
              <View style={[styles.bar, date === today && styles.todayBar, { height: `${(amount / peak) * 100}%` }]} />
            ) : null}
          </View>
        ))}
      </View>
      <View
        style={[styles.axis, staggerLabels && styles.staggeredAxis]}
        onLayout={({ nativeEvent }) => setAxisWidth(nativeEvent.layout.width)}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {days.map(({ day }) => (
          <View key={day} style={styles.axisColumn}>
            <Text
              allowFontScaling={false}
              style={[styles.dayLabel, staggerLabels && day % 2 === 0 && styles.lowerDayLabel]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** @param {{report: {month: string, income: number, expense: number, profit: number}, onOpenRecords?: (month: string) => void, onOpenReport: (month: string) => void, readOnly?: boolean}} props */
function MonthlyTotals({ report, onOpenRecords, onOpenReport, readOnly = false }) {
  const { month, income, expense, profit } = report;
  return (
    <View style={styles.month}>
      <Text accessibilityRole="header" style={styles.heading}>
        {monthFormat.format(new Date(`${month}-01T12:00:00`))}
      </Text>
      <View style={styles.financeRow}>
        <Text style={styles.label}>Gelir</Text>
        <Text style={styles.monthAmount}>{formatLira(income)}</Text>
      </View>
      <View style={styles.financeRow}>
        <Text style={styles.label}>Gider</Text>
        <Text style={styles.monthAmount}>{formatLira(expense)}</Text>
      </View>
      <View style={[styles.financeRow, styles.profitRow]}>
        <Text style={styles.profitLabel}>Net kâr</Text>
        <Text style={[styles.profitAmount, profit < 0 && styles.loss]}>{formatLira(profit)}</Text>
      </View>
      {!readOnly ? <ActionButton label="Kayıtları gör ve düzenle" tone="accent" onPress={() => onOpenRecords?.(month)} /> : null}
      <ActionButton label="Rapor olarak görüntüle" tone="accent" onPress={() => onOpenReport(month)} />
    </View>
  );
}

export default function EarningsScreen({ navigation }) {
  const today = useToday();
  const dailyEarnings = useStore((state) => state.dailyEarnings);
  const monthlyExpenses = useStore((state) => state.monthlyExpenses);
  const recordMonths = useStore((state) => state.recordMonths);
  const summaryMonths = useStore(state => state.summaryMonths);
  const lastYear = Number(today.slice(0, 4)) - 1;
  const lastMonths = Object.entries(summaryMonths).sort(([a], [b]) => a.localeCompare(b));
  const lastIncome = lastMonths.reduce((sum, [, m]) => sum + m.income, 0);
  const lastExpense = lastMonths.reduce((sum, [, m]) => sum + m.expense, 0);
  const totals = earningsSummary(dailyEarnings, today);
  const finances = monthlyFinances(totals, monthlyExpenses, today, [], recordMonths);
  function openReport(month) {
    navigation.navigate('Reports', { month });
  }
  function openRecords(month) {
    navigation.navigate('FinancialRecords', { month });
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={styles.title}>Kazanç</Text>
        <ActionButton
          label="Gider ekle"
          iconName="plus"
          tone="accent"
          onPress={() => navigation.navigate('AddExpense')}
        />
      </View>
      <View style={styles.today}>
        <Text style={styles.todayLabel}>Bugünkü kazanç</Text>
        <Text style={styles.todayAmount}>{formatLira(totals.today)}</Text>
      </View>
      <View style={styles.week}>
        <Text style={styles.label}>Bu hafta</Text>
        <Text style={styles.amount}>{formatLira(totals.week)}</Text>
      </View>
      <MonthlyTotals report={finances.current} onOpenRecords={openRecords} onOpenReport={openReport} />
      <MonthlyChart dailyEarnings={dailyEarnings} today={today} />
      {finances.previous.length > 0 ? (
        <View style={styles.history}>
          <Text accessibilityRole="header" style={styles.heading}>Geçmiş aylar</Text>
          {finances.previous.map((report) => (
            <MonthlyTotals key={report.month} report={report} onOpenRecords={openRecords} onOpenReport={openReport} />
          ))}
        </View>
      ) : null}
      <View style={styles.month}>
        <Text style={styles.heading}>{lastYear} yılı toplamı</Text>
        <Text style={styles.label}>Gelir: {formatLira(lastIncome)}</Text>
        <Text style={styles.label}>Gider: {formatLira(lastExpense)}</Text>
        <Text style={styles.profitAmount}>Net kâr: {formatLira(lastIncome - lastExpense)}</Text>
        <Text style={styles.label}>Geçen yılın yalnızca aylık ve yıllık toplamları saklanır.</Text>
        <ActionButton label="Yıllık özeti görüntüle" tone="accent" onPress={() => navigation.navigate('Reports', { month: lastYear + '-01', period: 'year' })} />
      </View>
      {lastMonths.map(([month, amounts]) => <MonthlyTotals key={month} report={{ month, ...amounts, profit: amounts.income - amounts.expense }} readOnly onOpenReport={openReport} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  today: { backgroundColor: colors.forest, borderRadius: 22, padding: 18, gap: 4 },
  todayLabel: { color: colors.amber, fontSize: 14, fontWeight: '700' },
  todayAmount: { color: colors.surface, fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  week: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, gap: 8,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 18,
  },
  label: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  amount: { color: colors.ink, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chart: {
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: 18, padding: 14,
  },
  chartHeading: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center', justifyContent: 'space-between' },
  scale: { color: colors.muted, fontSize: 12, marginTop: 5, marginBottom: 12 },
  plot: {
    flexDirection: 'row', height: 112, marginHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  midline: {
    position: 'absolute', top: '50%', left: 0, right: 0,
    backgroundColor: colors.line, height: StyleSheet.hairlineWidth,
  },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', minHeight: 2, backgroundColor: '#739C8D', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  todayBar: { backgroundColor: colors.forest },
  axis: { flexDirection: 'row', height: 20, marginHorizontal: 4 },
  staggeredAxis: { height: 34 },
  axisColumn: { flex: 1, alignItems: 'center' },
  dayLabel: { position: 'absolute', top: 4, width: 18, color: colors.muted, fontSize: 9, textAlign: 'center' },
  lowerDayLabel: { top: 17 },
  history: { marginTop: 6, gap: 8 },
  heading: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  month: {
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: 18, padding: 14, gap: 8,
  },
  financeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  monthAmount: { color: colors.ink, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  profitRow: { backgroundColor: colors.sage, borderRadius: 10, padding: 10, marginTop: 2 },
  profitLabel: { color: colors.forest, fontSize: 15, fontWeight: '700' },
  profitAmount: { color: colors.forest, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  loss: { color: colors.danger },
});
