import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePicker, TimePicker } from '../components/AppointmentPickers';
import { isValidDate, localDate, useToday } from '../dates';
import { ActionButton, colors, Icon } from '../ui';
import { useStore } from '../store/useStore';
import { useSaveAction } from '../useSaveAction';

function PickerField({ label, value, iconName, style, onPress }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={onPress}
        style={({ pressed }) => [styles.inputFrame, styles.pickerField, pressed && styles.pressed]}
      >
        <Icon name={iconName} />
        <Text style={styles.pickerValue}>{value}</Text>
      </Pressable>
    </View>
  );
}

export default function AddAppointmentScreen({ navigation, route }) {
  const editing = route.name === 'EditAppointment';
  const id = route.params?.id;
  const appointment = useStore((state) => state.appointments.find((item) => item.id === id));
  const addAppointment = useStore((state) => state.addAppointment);
  const reschedule = useStore((state) => state.rescheduleAppointment);
  const today = useToday();
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(() => {
    const selectedDate = appointment?.date ?? route.params?.date;
    return isValidDate(selectedDate) && selectedDate >= today ? selectedDate : today;
  });
  const [time, setTime] = useState(() => appointment?.time ?? '');
  const [picker, setPicker] = useState(/** @type {string | null} */ (null));
  const [nameFocused, setNameFocused] = useState(false);
  const [error, setError] = useState('');
  const { saving, saveError, runSave } = useSaveAction();

  function openPicker(nextPicker) {
    Keyboard.dismiss();
    setPicker(nextPicker);
  }

  function closePicker() {
    setPicker(null);
  }

  function save() {
    const name = customerName.trim();
    if (!editing && !name) {
      setError('Müşteri adını gir.');
      return;
    }
    if (date < localDate()) {
      setError('Bugünü veya ileri bir tarih seç.');
      return;
    }
    if (!time) {
      setError('Randevu saatini seç.');
      return;
    }

    runSave(() => editing
      ? reschedule(id, date, time)
      : addAppointment({ customerName: name, date, time }));
  }

  if (editing && !appointment) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <View style={styles.form}>
          <Text style={styles.description}>Bu randevu artık mevcut değil.</Text>
          <ActionButton label="Geri dön" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <View style={styles.iconBox}><Icon name="calendar" /></View>
          <View style={styles.introText}>
            <Text accessibilityRole="header" style={styles.title}>
              {editing ? 'Tarih ve saati değiştir' : 'Yeni randevu'}
            </Text>
            <Text style={styles.description}>
              {editing ? appointment?.customerName : 'Müşterinin adını gir, tarih ve saat seç.'}
            </Text>
          </View>
        </View>
        <View collapsable={false} pointerEvents={saving ? 'none' : 'auto'} style={styles.card}>
          {!editing ? <View style={styles.field}>
            <Text style={styles.label}>Müşteri adı</Text>
            <View style={[styles.inputFrame, nameFocused && styles.focused]}>
              <TextInput
                accessibilityLabel="Müşteri adı"
                editable={!saving}
                autoCapitalize="words"
                maxLength={80}
                onBlur={() => setNameFocused(false)}
                onChangeText={(value) => {
                  setCustomerName(value);
                  setError('');
                }}
                onFocus={() => setNameFocused(true)}
                placeholder="Ad soyad"
                placeholderTextColor={colors.muted}
                selectionColor={colors.forest}
                style={styles.input}
                value={customerName}
              />
            </View>
          </View> : null}
          <View style={styles.timeRow}>
            <PickerField
              label="Tarih"
              value={date.split('-').reverse().join('.')}
              iconName="calendar"
              style={styles.dateField}
              onPress={() => openPicker('date')}
            />
            <PickerField
              label="Saat"
              value={time || 'Saat seç'}
              iconName="clock"
              style={styles.timeField}
              onPress={() => openPicker('time')}
            />
          </View>
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {saveError ? <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text> : null}
        <ActionButton
          label={saving ? 'Kaydediliyor…' : editing ? 'Değişiklikleri kaydet' : 'Randevuyu kaydet'}
          disabled={saving}
          onPress={save}
        />
      </ScrollView>
      {picker === 'date' ? (
        <DatePicker
          value={date < today ? today : date}
          minDate={today}
          onClose={closePicker}
          onSelect={(selectedDate) => {
            setDate(selectedDate);
            setError('');
            closePicker();
          }}
        />
      ) : null}
      {picker === 'time' ? (
        <TimePicker
          value={time}
          onClose={closePicker}
          onSelect={(selectedTime) => {
            setTime(selectedTime);
            setError('');
            closePicker();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  form: { padding: 18, paddingTop: 8, gap: 16 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { backgroundColor: colors.sage, borderRadius: 14, padding: 12 },
  introText: { flex: 1, gap: 3 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  description: { color: colors.muted, fontSize: 14 },
  card: {
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: 20, padding: 14, gap: 13,
  },
  field: { gap: 5 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dateField: { flex: 3, minWidth: 150 },
  timeField: { flex: 2, minWidth: 108 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  inputFrame: {
    backgroundColor: colors.canvas, borderColor: colors.line, borderWidth: 1,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center',
  },
  focused: { borderColor: colors.forest },
  input: {
    flex: 1, minHeight: 47, paddingHorizontal: 11, paddingVertical: 9,
    color: colors.ink, fontSize: 15,
  },
  pickerField: { minHeight: 47, paddingHorizontal: 9, paddingVertical: 8, gap: 6 },
  pickerValue: { color: colors.ink, fontSize: 15, flexShrink: 1 },
  pressed: { backgroundColor: colors.sage },
  error: { color: colors.danger, fontSize: 14, paddingHorizontal: 3 },
});
