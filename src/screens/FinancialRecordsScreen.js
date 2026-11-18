import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store/useStore';
import { expenseCategories, formatLira } from '../earnings';
import { financialRecordTitle } from '../financialRecords';
import { ActionButton, colors } from '../ui';
import { useFinancialRecords } from '../useFinancialRecords';

const monthFormat = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });

export default function FinancialRecordsScreen({ navigation, route }) {
  const month = route.params.month;
  const { records, loading, error, reload } = useFinancialRecords([month]);
  const appointments = useStore((state) => state.appointments);
  const monthlyRecords = records.filter((record) => record.date.startsWith(month))
    .sort((first, second) => second.date.localeCompare(first.date));

  return (
    <FlatList
      data={monthlyRecords}
      keyExtractor={(record) => record.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text accessibilityRole="header" style={styles.heading}>
          {monthFormat.format(new Date(`${month}-01T12:00:00`))}
        </Text>
      }
      ListEmptyComponent={<View><Text style={styles.description}>{loading ? 'Kayıtlar yükleniyor…' : error || 'Bu ay için gelir veya gider kaydı yok.'}</Text>{error ? <ActionButton label="Tekrar dene" onPress={reload} /> : null}</View>}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const customerName = appointments.find((appointment) => appointment.id === item.appointmentId)?.customerName;
        return (
          <View style={styles.card}>
            <Text style={styles.title}>{financialRecordTitle(item)}</Text>
            <Text style={styles.description}>
              {item.type === 'expense' ? expenseCategories[item.category] : customerName ?? 'Gelir'}
            </Text>
            <Text style={styles.description}>{item.type === 'expense'
              ? monthFormat.format(new Date(item.date + 'T12:00:00'))
              : item.date.split('-').reverse().join('.')}</Text>
            <View style={styles.row}>
              <Text style={[styles.amount, item.type === 'expense' && styles.expense]}>
                {item.amountKurus == null ? 'Tutar girilmedi' : formatLira(item.amountKurus)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${financialRecordTitle(item)} düzenle`}
                onPress={() => navigation.navigate('EditFinancialRecord', { id: item.id, month, record: item })}
                style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
              >
                <Text style={styles.editLabel}>Düzenle</Text>
              </Pressable>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 18, paddingTop: 8 },
  heading: { color: colors.ink, fontSize: 24, fontWeight: '800', marginBottom: 14 },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 5 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 14 },
  separator: { height: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  amount: { color: colors.forest, fontSize: 18, fontWeight: '800' },
  expense: { color: colors.danger },
  edit: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.forest },
  editLabel: { color: colors.forest, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
