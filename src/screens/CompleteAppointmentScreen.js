import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseKurus } from '../earnings';
import { useStore } from '../store/useStore';
import { ActionButton, colors, Icon } from '../ui';
import { useSaveAction } from '../useSaveAction';

export default function CompleteAppointmentScreen({ navigation, route }) {
  const id = route.params?.id;
  const appointment = useStore((state) => state.appointments.find((item) => item.id === id));
  const complete = useStore((state) => state.completeAppointment);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const available = appointment?.status === 'bekliyor';
  const { saving, saveError, runSave } = useSaveAction();

  function save() {
    const earnedKurus = parseKurus(amount);
    if (earnedKurus == null) {
      setError('Geçerli bir TL tutarı gir veya Atla’yı seç.');
      return;
    }
    runSave(() => complete(id, earnedKurus));
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {available || saving ? (
          <>
            <View style={styles.intro}>
              <View style={styles.iconBox}><Icon name="earnings" /></View>
              <View style={styles.introText}>
                <Text accessibilityRole="header" style={styles.title}>Kazanç gir</Text>
                <Text style={styles.customer}>{appointment?.customerName}</Text>
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Kazanılan tutar (isteğe bağlı)</Text>
              <View style={styles.inputFrame}>
                <TextInput
                  accessibilityLabel="Kazanılan tutar"
                  editable={!saving}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={colors.muted}
                  maxLength={12}
                  value={amount}
                  onChangeText={(value) => {
                    setAmount(value);
                    setError('');
                  }}
                  style={styles.input}
                />
                <Text style={styles.currency}>TL</Text>
              </View>
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {saveError ? <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text> : null}
            <ActionButton label={saving ? 'Kaydediliyor…' : 'Kazancı kaydet'} disabled={saving} onPress={save} />
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              accessibilityState={{ disabled: saving }}
              onPress={() => runSave(() => complete(id, null))}
              style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
            >
              <Text style={styles.skipLabel}>Atla</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.customer}>Bu randevu için kazanç girişi kapalı.</Text>
            <ActionButton label="Geri dön" onPress={() => navigation.goBack()} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  form: { padding: 18, paddingTop: 8, gap: 16 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  introText: { flex: 1, gap: 3 },
  iconBox: { backgroundColor: colors.sage, borderRadius: 14, padding: 12 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  customer: { color: colors.muted, fontSize: 15 },
  card: {
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: 20, padding: 14, gap: 8,
  },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  inputFrame: {
    backgroundColor: colors.canvas, borderColor: colors.line, borderWidth: 1,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center',
  },
  input: {
    flex: 1, minHeight: 50, paddingHorizontal: 11, paddingVertical: 9,
    color: colors.ink, fontSize: 19, fontVariant: ['tabular-nums'],
  },
  currency: { color: colors.forest, fontSize: 15, fontWeight: '700', marginRight: 13 },
  error: { color: colors.danger, fontSize: 14 },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { color: colors.forest, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
