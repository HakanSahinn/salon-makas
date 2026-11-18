import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppointmentCalendar } from '../components/AppointmentCalendar';
import { AppointmentList, useDailyAppointments } from '../components/AppointmentList';
import { useToday } from '../dates';
import { useStore } from '../store/useStore';
import { ActionButton, colors } from '../ui';

const dayFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric',
});

export default function CalendarScreen({ navigation }) {
  const today = useToday();
  const [selectedDay, setSelectedDay] = useState(/** @type {string | null} */ (null));
  const date = selectedDay ?? today;
  const appointments = useDailyAppointments(date);
  const allAppointments = useStore((state) => state.appointments);
  const markedDates = useMemo(() => {
    const marks = {};
    for (const appointment of allAppointments) {
      marks[appointment.date] = { marked: true };
    }
    marks[date] = { ...marks[date], selected: true };
    return marks;
  }, [allAppointments, date]);

  return (
    <AppointmentList
      appointments={appointments}
      emptyTitle="Bu gün boş"
      emptyMessage="Seçili tarihe henüz randevu eklenmedi."
      header={
        <>
          <Text accessibilityRole="header" style={styles.title}>Takvim</Text>
          <View style={styles.calendarCard}>
            <AppointmentCalendar
              markedDates={markedDates}
              onSelectDate={setSelectedDay}
            />
            <View style={styles.legend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendLabel}>Randevu olan gün</Text>
            </View>
          </View>
          <View style={styles.selection}>
            <View style={styles.selectionDetails}>
              <Text accessibilityRole="header" style={styles.selectionDate}>
                {dayFormat.format(new Date(`${date}T12:00:00`))}
              </Text>
              <Text style={styles.count}>{appointments.length} randevu</Text>
            </View>
            {date >= today ? (
              <ActionButton
                label="Randevu ekle"
                iconName="plus"
                tone="accent"
                onPress={() => navigation.navigate('AddAppointment', { date })}
              />
            ) : null}
          </View>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1, marginBottom: 10 },
  calendarCard: {
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: 20, overflow: 'hidden', paddingHorizontal: 4,
  },
  legend: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10,
    paddingHorizontal: 10, marginHorizontal: 9,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
  legendDot: { backgroundColor: colors.forest, width: 6, height: 6, borderRadius: 3 },
  legendLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  selection: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 14 },
  selectionDetails: { flex: 1, minWidth: 120 },
  selectionDate: { color: colors.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  count: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
