import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, colors } from '../ui';
import { AppointmentCalendar } from './AppointmentCalendar';

const optionHeight = 44;
const timeSlots = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0');
  return `${hour}:${index % 2 === 0 ? '00' : '30'}`;
});

function PickerDialog({ title, onClose, children }) {
  return (
    <Modal animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {children}
          <Pressable accessibilityRole="button" style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Vazgeç</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** @param {{value: string, minDate?: string, maxDate?: string, onSelect: (date: string) => void, onClose: () => void}} props */
export function DatePicker({ value, minDate, maxDate, onSelect, onClose }) {
  return (
    <PickerDialog title="Tarih seç" onClose={onClose}>
      <AppointmentCalendar
        initialDate={value}
        minDate={minDate}
        maxDate={maxDate}
        markedDates={{ [value]: { selected: true } }}
        onSelectDate={onSelect}
      />
    </PickerDialog>
  );
}

export function TimePicker({ value, onSelect, onClose }) {
  const [hour, minute] = (value || '09:00').split(':').map(Number);
  const initialSlot = timeSlots[hour * 2 + Math.floor(minute / 30)] ?? '09:00';
  const [time, setTime] = useState(initialSlot);

  return (
    <PickerDialog title="Saat seç" onClose={onClose}>
      <Text accessibilityLiveRegion="polite" style={styles.preview}>{time}</Text>
      <View style={styles.options}>
        <FlatList
          data={timeSlots}
          keyExtractor={(item) => item}
          initialScrollIndex={Math.max(0, timeSlots.indexOf(initialSlot) - 2)}
          getItemLayout={(_, index) => ({
            length: optionHeight,
            offset: optionHeight * index,
            index,
          })}
          persistentScrollbar
          renderItem={({ item }) => {
            const selected = time === item;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Saat ${item}`}
                accessibilityState={{ selected }}
                onPress={() => setTime(item)}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item}</Text>
              </Pressable>
            );
          }}
        />
      </View>
      <ActionButton label="Saati seç" onPress={() => onSelect(time)} />
    </PickerDialog>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 16, backgroundColor: '#192A237A',
  },
  dialog: {
    width: '100%', maxWidth: 360, backgroundColor: colors.surface,
    borderRadius: 20, padding: 12, gap: 8,
  },
  title: { color: colors.ink, fontSize: 21, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  preview: {
    color: colors.forest, fontSize: 34, fontWeight: '800',
    fontVariant: ['tabular-nums'], textAlign: 'center',
  },
  options: {
    height: optionHeight * 5.5, backgroundColor: colors.canvas, borderColor: colors.line,
    borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 8,
  },
  option: { height: optionHeight, justifyContent: 'center', alignItems: 'center' },
  optionSelected: { backgroundColor: colors.sage },
  optionPressed: { opacity: 0.65 },
  optionText: { color: colors.ink, fontSize: 16, fontVariant: ['tabular-nums'] },
  optionTextSelected: { color: colors.forest, fontWeight: '800' },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.forest, fontSize: 15, fontWeight: '700' },
});
