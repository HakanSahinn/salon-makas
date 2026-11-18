import { StyleSheet, Text, View } from 'react-native';
import { AppointmentList, useDailyAppointments } from '../components/AppointmentList';
import { useToday } from '../dates';
import { ActionButton, colors } from '../ui';

const dayFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric', month: 'long', weekday: 'long',
});

export default function HomeScreen({ navigation }) {
  const today = useToday();
  const appointments = useDailyAppointments(today);
  const completed = appointments.filter((item) => item.status === 'tamamlandi').length;
  const dateLabel = dayFormat.format(new Date(`${today}T12:00:00`));

  return (
    <AppointmentList
      appointments={appointments}
      emptyTitle="Bugün randevu yok"
      emptyMessage="İlk randevunu ekleyerek gününü planla."
      header={
        <>
          <View style={styles.hero}>
            <View pointerEvents="none" style={styles.ringOuter} />
            <View pointerEvents="none" style={styles.ringInner} />
            <Text style={styles.date}>{dateLabel}</Text>
            <Text accessibilityRole="header" style={styles.title}>Günün planı</Text>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.number}>{appointments.length - completed}</Text>
                <Text style={styles.statLabel}>Bekliyor</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.number}>{completed}</Text>
                <Text style={styles.statLabel}>Tamamlandı</Text>
              </View>
            </View>
            <ActionButton
              label="Randevu ekle"
              iconName="plus"
              tone="accent"
              onPress={() => navigation.navigate('AddAppointment')}
            />
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Bugünkü randevular</Text>
            <Text style={styles.count}>{appointments.length} kayıt</Text>
          </View>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.forest, borderRadius: 24, padding: 18,
    overflow: 'hidden',
  },
  ringOuter: {
    position: 'absolute', top: -100, right: -70, width: 250, height: 250,
    borderColor: '#37584B', borderWidth: 1, borderRadius: 125,
  },
  ringInner: {
    position: 'absolute', top: -72, right: -58, width: 198, height: 198,
    borderColor: '#37584B', borderWidth: 1, borderRadius: 99,
  },
  date: { color: colors.amber, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: colors.surface, fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  stats: {
    flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 16,
    paddingVertical: 8, backgroundColor: '#284B3F', borderRadius: 14,
  },
  stat: { flex: 1, paddingHorizontal: 9, alignItems: 'center' },
  statDivider: { height: 32, width: 1, backgroundColor: '#507365' },
  number: { color: colors.surface, fontSize: 23, fontWeight: '800' },
  statLabel: { color: '#D6E4D9', fontSize: 12, textAlign: 'center' },
  section: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  count: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});
