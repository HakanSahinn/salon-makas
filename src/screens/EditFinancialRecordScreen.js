import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { expenseCategories, parseKurus } from '../earnings';
import { financialRecordTitle } from '../financialRecords';
import { useSaveAction } from '../useSaveAction';
import { ActionButton, colors } from '../ui';
import { useFinancialRecords } from '../useFinancialRecords';

export default function EditFinancialRecordScreen({ navigation, route }) {
  const id = route.params.id;
  const month = route.params.month;
  const { records, loading, error: loadError, reload } = useFinancialRecords([month]);
  const record = loading ? route.params.record : records.find((item) => item.id === id);
  const update = useStore((state) => state.updateFinancialRecord);
  const remove = useStore((state) => state.deleteFinancialRecord);
  const [original] = useState(record);
  const [amount, setAmount] = useState(() => record?.amountKurus == null ? '' : (record.amountKurus / 100).toFixed(2).replace('.', ','));
  const [category, setCategory] = useState(record?.category);
  const [error, setError] = useState('');
  const { saving, saveError, runSave } = useSaveAction();
  const displayed = record ?? original;

  function save() {
    const amountKurus = parseKurus(amount);
    if (amountKurus == null || (displayed.type === 'expense' && amountKurus === 0)) {
      setError('Geçerli bir TL tutarı gir.');
      return;
    }
    runSave(() => update(id, amountKurus, category, month));
  }

  function confirmDelete() {
    Alert.alert('Mali kaydı sil', 'Bu kaydı silmek gelir, gider ve net kâr toplamlarını güncelleyecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => runSave(() => remove(id, month)) },
    ]);
  }

  if (!record && !saving) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.description}>{loadError || 'Bu kayıt artık mevcut değil.'}</Text>{loadError ? <ActionButton label="Tekrar dene" onPress={reload} /> : null}
          <ActionButton label="Geri dön" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>{financialRecordTitle(displayed)}</Text>
        {displayed.legacy ? (
          <Text style={styles.description}>
            {displayed.type === 'income'
              ? 'Bu kayıt önceki sürümden kalan günlük toplamdır.'
              : 'Bu kayıt önceki sürümden kalan aylık kategori toplamıdır.'}
          </Text>
        ) : null}
        <View collapsable={false} pointerEvents={saving ? 'none' : 'auto'} style={styles.card}>
          <Text style={styles.label}>Tutar (TL)</Text>
          <TextInput
            accessibilityLabel="Mali kayıt tutarı"
            editable={!saving}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={colors.muted}
            value={amount}
            onChangeText={(value) => { setAmount(value); setError(''); }}
          />
          {displayed.type === 'expense' ? (
            <View accessibilityRole="radiogroup" style={styles.categories}>
              {Object.entries(expenseCategories).map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: category === key }}
                  onPress={() => setCategory(key)}
                  style={[styles.option, category === key && styles.checked]}
                >
                  <Text style={styles.label}>{label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        {error || saveError ? <Text accessibilityRole="alert" style={styles.error}>{error || saveError}</Text> : null}
        <ActionButton label={saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'} disabled={saving || loading} onPress={save} />
        <Pressable accessibilityRole="button" disabled={saving} onPress={confirmDelete} style={styles.delete}>
          <Text style={styles.error}>Kaydı sil</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 18, paddingTop: 8, gap: 14 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 9, borderWidth: 1, borderColor: colors.line },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  input: { minHeight: 48, backgroundColor: colors.canvas, borderRadius: 12, padding: 12, color: colors.ink, fontSize: 18 },
  categories: { gap: 8, marginTop: 4 },
  option: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, justifyContent: 'center' },
  checked: { borderColor: colors.forest, backgroundColor: colors.sage },
  error: { color: colors.danger, fontSize: 14 },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
