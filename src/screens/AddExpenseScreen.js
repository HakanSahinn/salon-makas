import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { expenseCategories, parseKurus } from '../earnings';
import { useStore } from '../store/useStore';
import { ActionButton, colors } from '../ui';
import { useSaveAction } from '../useSaveAction';

export default function AddExpenseScreen() {
  const addExpense = useStore((state) => state.addExpense);
  const [category, setCategory] = useState(/** @type {string | null} */ (null));
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const { saving, saveError, runSave } = useSaveAction();

  function save() {
    if (!category) {
      setError('Bir gider kategorisi seç.');
      return;
    }
    const expense = parseKurus(amount);
    if (expense == null || expense <= 0) {
      setError('Sıfırdan büyük bir TL tutarı gir.');
      return;
    }
    runSave(() => addExpense(category, expense));
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Yeni gider</Text>
        <Text style={styles.description}>Gider, bu ayın toplamına eklenir.</Text>
        <View collapsable={false} pointerEvents={saving ? 'none' : 'auto'} style={styles.card}>
          <Text accessibilityRole="header" style={styles.label}>Gider kategorisi</Text>
          <View accessibilityRole="radiogroup" style={styles.options}>
            {Object.entries(expenseCategories).map(([id, label]) => {
              const checked = category === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  onPress={() => {
                    setCategory(id);
                    setError('');
                  }}
                  style={({ pressed }) => [styles.option, checked && styles.checked, pressed && styles.pressed]}
                >
                  <View style={[styles.radio, checked && styles.radioChecked]}>
                    {checked ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={styles.optionLabel}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>Gider tutarı</Text>
          <View style={styles.amountField}>
            <TextInput
              accessibilityLabel="Gider tutarı"
              editable={!saving}
              keyboardType="decimal-pad"
              maxLength={12}
              placeholder="0,00"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={amount}
              onChangeText={(value) => {
                setAmount(value);
                setError('');
              }}
            />
            <Text style={styles.currency}>TL</Text>
          </View>
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {saveError ? <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text> : null}
        <ActionButton label={saving ? 'Kaydediliyor…' : 'Gideri kaydet'} disabled={saving} onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 18, paddingTop: 8, gap: 12 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  description: { color: colors.muted, fontSize: 14 },
  card: {
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: 20, padding: 14, gap: 9,
  },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  options: { gap: 6, marginBottom: 5 },
  option: {
    minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    borderColor: colors.line, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9,
  },
  checked: { backgroundColor: colors.sage, borderColor: colors.forest },
  pressed: { opacity: 0.7 },
  optionLabel: { color: colors.ink, fontSize: 14, fontWeight: '600', flex: 1 },
  radio: {
    width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, borderColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  radioChecked: { borderColor: colors.forest },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.forest },
  amountField: {
    backgroundColor: colors.canvas, borderColor: colors.line, borderWidth: 1,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center',
  },
  input: {
    flex: 1, minHeight: 47, paddingHorizontal: 11, paddingVertical: 8,
    color: colors.ink, fontSize: 17, fontVariant: ['tabular-nums'],
  },
  currency: { color: colors.forest, fontSize: 14, fontWeight: '700', paddingRight: 12 },
  error: { color: colors.danger, fontSize: 14 },
});
