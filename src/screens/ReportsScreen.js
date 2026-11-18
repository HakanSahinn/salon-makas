import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { DatePicker } from '../components/AppointmentPickers';
import { useToday } from '../dates';
import { expenseCategories, formatLira } from '../earnings';
import { financialRecordTitle } from '../financialRecords';
import { reportRange } from '../reports';
import { ActionButton, colors } from '../ui';
import { useFinancialReport } from '../useFinancialReport';

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const periods = { week: 'Haftalık', month: 'Aylık', year: 'Yıllık', custom: 'Tarih aralığı' };
const displayDate = (date) => date.split('-').reverse().join('.');

export default function ReportsScreen({ route }) {
  const today = useToday();
  const initial = route.params?.month && route.params.month !== today.slice(0, 7) ? `${route.params.month}-01` : today;
  const [period, setPeriod] = useState(route.params?.period ?? 'month');
  const [selectedDate, setSelectedDate] = useState(initial);
  const [start, setStart] = useState(initial);
  const [end, setEnd] = useState(today);
  const [picker, setPicker] = useState(/** @type {string | null} */ (null));
  const [pages, setPages] = useState({ key: '', cursors: /** @type {({date:string,id:string}|null)[]} */ ([null]), index: 0 });
  const range = reportRange(period, selectedDate > today ? today : selectedDate, today, start, end);
  const invalid = range.start > range.end;
  const pageKey = JSON.stringify({ range, period, today });
  const currentPages = pages.key === pageKey ? pages : { key: pageKey, cursors: [null], index: 0 };
  const { report: loadedReport, loading, error, reload } = useFinancialReport({ range, today, period, cursor: currentPages.cursors[currentPages.index] });
  const report = loadedReport ?? { rows: [], categories: {}, income: 0, expense: 0, profit: 0, totalRecords: 0, skipped: 0, summaryOnly: false, nextCursor: null };
  const showExpenses = period === 'month' || period === 'year';
  const year = Number(selectedDate.slice(0, 4));

  function chooseDate(date) {
    if (picker === 'start') setStart(date);
    else if (picker === 'end') setEnd(date);
    else setSelectedDate(date);
    setPicker(null);
  }

  return (
    <>
      <FlatList
        key={`${pageKey}:${currentPages.index}`}
        data={report.rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Gelir ve gider raporu</Text>
            <Text style={styles.description}>Bu ekran yalnızca görüntüleme içindir.</Text>
            <View style={styles.tabs}>
              {Object.entries(periods).filter(([key]) => selectedDate.slice(0, 4) === today.slice(0, 4) || ['month', 'year'].includes(key)).map(([key, label]) => (
                <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: key === period }}
                  onPress={() => {
                    setPeriod(key);
                    if (key === 'year' && selectedDate.slice(0, 4) === today.slice(0, 4)) setSelectedDate(today);
                  }} style={[styles.tab, period === key && styles.activeTab]}>
                  <Text style={[styles.tabText, period === key && styles.activeText]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {showExpenses ? (
              <View style={styles.card}>
                <View style={styles.yearRow}>
                  <ActionButton label="Önceki yıl" tone="accent" disabled={year <= Number(today.slice(0, 4)) - 1} onPress={() => setSelectedDate(`${year - 1}-01-01`)} />
                  <Text style={styles.heading}>{year}</Text>
                  <ActionButton label="Sonraki yıl" tone="accent" disabled={year >= Number(today.slice(0, 4))} onPress={() => setSelectedDate(`${year + 1}-01-01`)} />
                </View>
                {period === 'month' ? <View style={styles.tabs}>
                  {months.map((month, index) => {
                    const date = `${year}-${String(index + 1).padStart(2, '0')}-01`;
                    const selected = selectedDate.slice(0, 7) === date.slice(0, 7);
                    return (
                      <Pressable key={month} accessibilityRole="button" accessibilityState={{ selected, disabled: date > today }} disabled={date > today}
                        onPress={() => setSelectedDate(date)} style={[styles.month, selected && styles.activeTab, date > today && styles.disabled]}>
                        <Text style={[styles.tabText, selected && styles.activeText]}>{month}</Text>
                      </Pressable>
                    );
                  })}
                </View> : null}
              </View>
            ) : period === 'custom' ? (
              <>
                <ActionButton label={`Başlangıç: ${displayDate(start)}`} tone="accent" onPress={() => setPicker('start')} />
                <ActionButton label={`Bitiş: ${displayDate(end)}`} tone="accent" onPress={() => setPicker('end')} />
              </>
            ) : (
              <ActionButton label={`${period === 'year' ? 'Yıl ve son tarih' : 'Haftadan bir gün seç'}: ${displayDate(selectedDate)}`}
                tone="accent" onPress={() => setPicker('selected')} />
            )}
            {loading ? <Text style={styles.description}>Rapor yükleniyor…</Text> : error ? <View><Text style={styles.warning}>{error}</Text><ActionButton label="Tekrar dene" onPress={reload} /></View> : invalid ? <Text style={styles.warning}>Başlangıç tarihi bitiş tarihinden sonra olamaz.</Text> : (
              <>
                <Text style={styles.heading}>{displayDate(range.start)} – {displayDate(range.end)}</Text>
                <Text style={styles.description}>
                  {period === 'week' ? 'Hafta pazartesi başlar. ' : ''}
                  {period === 'year' ? 'Seçilen yılın tüm gelir ve giderleri. ' : ''}Gelecek günler hesaba katılmaz.
                </Text>
                <View style={styles.card}>
                  {(showExpenses ? [['Gelir', report.income], ['Gider', report.expense], ['Net kâr', report.profit]] : [['Gelir', report.income]]).map(([label, amount]) => (
                    <View key={label} style={styles.row}>
                      <Text style={styles.heading}>{label}</Text>
                      <Text style={[styles.amount, Number(amount) < 0 && styles.warning]}>{formatLira(amount)}</Text>
                    </View>
                  ))}
                </View>
                {showExpenses && !report.summaryOnly ? <View style={styles.card}>
                  <Text style={styles.heading}>Gider dağılımı</Text>
                  {Object.entries(expenseCategories).map(([key, label]) => (
                    <View key={key} style={styles.row}>
                      <Text style={styles.category}>{label}</Text>
                      <Text style={styles.value}>{formatLira(report.categories[key] ?? 0)}</Text>
                    </View>
                  ))}
                </View> : <Text style={styles.description}>{report.summaryOnly ? 'Geçen yıl için ayrıntı tutulmaz; yalnızca gelir, gider ve net kâr gösterilir.' : 'Giderler ve net kâr yalnızca aylık ve yıllık raporlarda gösterilir.'}</Text>}
                {report.skipped > 0 ? <Text style={styles.description}>{report.skipped} gelir kaydında tutar girilmemiş; toplamlara eklenmedi.</Text> : null}
                {!report.summaryOnly ? <Text style={styles.heading}>Kayıtlar ({report.totalRecords})</Text> : null}
              </>
            )}
          </View>
        }
        ListEmptyComponent={!report.summaryOnly && !invalid && !loading && !error ? <Text style={styles.description}>Seçilen dönemde kayıt yok.</Text> : undefined}
        ListFooterComponent={!report.summaryOnly && !loading && !error && !invalid ? <View style={styles.header}>
          <Text style={styles.description}>Sayfa {currentPages.index + 1}</Text>
          {currentPages.index > 0 ? <ActionButton label="Önceki kayıtlar" tone="accent" onPress={() => setPages({ ...currentPages, index: currentPages.index - 1 })} /> : null}
          {report.nextCursor ? <ActionButton label="Sonraki kayıtlar" tone="accent" onPress={() => setPages({ key: pageKey,
            cursors: [...currentPages.cursors.slice(0, currentPages.index + 1), report.nextCursor], index: currentPages.index + 1 })} /> : null}
        </View> : undefined}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.heading}>{financialRecordTitle(item)}</Text>
            <Text style={styles.description}>{item.type === 'expense' ? `${months[Number(item.date.slice(5, 7)) - 1]} ${item.date.slice(0, 4)} · Aylık gider` : displayDate(item.date)}</Text>
            {item.type === 'expense' ? <Text style={styles.description}>{expenseCategories[item.category]}</Text> : null}
            <Text style={styles.amount}>{item.amountKurus == null ? 'Tutar girilmedi' : formatLira(item.amountKurus)}</Text>
          </View>
        )}
      />
      {picker ? <DatePicker value={picker === 'start' ? start : picker === 'end' ? end : selectedDate} minDate={today.slice(0, 4) + '-01-01'} maxDate={today} onSelect={chooseDate} onClose={() => setPicker(null)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 10, paddingBottom: 30 },
  header: { gap: 12 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800' },
  heading: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.sage },
  month: { width: '30%', minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: colors.sage },
  activeTab: { backgroundColor: colors.forest },
  tabText: { color: colors.forest, fontWeight: '700', fontSize: 14 },
  activeText: { color: colors.surface },
  disabled: { opacity: 0.35 },
  card: { padding: 14, gap: 10, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  yearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  category: { color: colors.muted, fontSize: 14, flexShrink: 1 },
  value: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  amount: { color: colors.forest, fontSize: 20, fontWeight: '800' },
  warning: { color: colors.danger, fontSize: 14, lineHeight: 21 },
});
