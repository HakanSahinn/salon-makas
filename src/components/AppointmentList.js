import { useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { formatLira } from '../earnings';
import { useStore } from '../store/useStore';
import { colors, Icon } from '../ui';
import { SwipeableAppointment } from './SwipeableAppointment';

export function useDailyAppointments(date) {
  const appointments = useStore((state) => state.appointments);
  return appointments
    .filter((appointment) => appointment.date === date)
    .sort((first, second) => first.time.localeCompare(second.time));
}

export function AppointmentList({ appointments, header, emptyTitle, emptyMessage }) {
  const navigation = useNavigation();
  const remove = useStore((state) => state.deleteAppointment);
  const [revealedId, setRevealedId] = useState(/** @type {string | null} */ (null));
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null));
  const deleting = useRef(false);

  async function deleteSavedAppointment(appointment) {
    if (deleting.current) return;
    deleting.current = true;
    setDeletingId(appointment.id);
    try {
      await remove(appointment.id);
    } catch {
      Alert.alert('Silinemedi', 'Değişiklik telefona kaydedilemedi.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Tekrar dene', onPress: () => deleteSavedAppointment(appointment) },
      ]);
    } finally {
      deleting.current = false;
      setDeletingId(null);
    }
  }

  function confirmDelete({ id, customerName, earnedKurus = undefined }) {
    if (deleting.current) return;
    setRevealedId(null);
    const message = `${customerName} adlı müşterinin randevusu silinsin mi?`;
    const details = earnedKurus == null ? message : `${message} Kayıtlı kazanç toplamda kalır.`;
    Alert.alert('Randevuyu sil', details, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteSavedAppointment({ id }) },
    ]);
  }

  /** @param {'CompleteAppointment' | 'EditAppointment'} screen @param {string} id */
  function openAppointment(screen, id) {
    setRevealedId(null);
    navigation.navigate(screen, { id });
  }

  return (
    <FlatList
      data={appointments}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      ListHeaderComponentStyle={styles.header}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Icon name="calendar" /></View>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      }
      renderItem={({ item }) => {
        const completed = item.status === 'tamamlandi';
        const hasEarnings = item.earnedKurus != null;

        return (
          <SwipeableAppointment
            expanded={revealedId === item.id}
            onExpandedChange={(open) => {
              if (!deletingId) setRevealedId(open ? item.id : null);
            }}
            deleteLabel={`${item.customerName} randevusunu sil`}
            onDelete={() => confirmDelete(item)}
          >
            <View pointerEvents={deletingId ? 'none' : 'auto'} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.timeBox}><Text style={styles.time}>{item.time}</Text></View>
                <View style={styles.customer}>
                <Text
                  style={styles.name}
                  accessibilityActions={[{ name: 'delete', label: 'Randevuyu sil' }]}
                  onAccessibilityAction={({ nativeEvent }) => {
                    if (nativeEvent.actionName === 'delete') confirmDelete(item);
                  }}
                >
                  {item.customerName}
                  {deletingId === item.id ? ' · Siliniyor…' : ''}
                </Text>
                <View style={[styles.badge, completed ? styles.doneBadge : styles.waitingBadge]}>
                  <Text style={[styles.badgeText, completed ? styles.doneText : styles.waitingText]}>
                    {completed ? 'Tamamlandı' : 'Bekliyor'}
                  </Text>
                </View>
                </View>
                {hasEarnings ? <Text style={styles.earnings}>{formatLira(item.earnedKurus)}</Text> : null}
              </View>
              <View style={styles.cardBottom}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.customerName}: Düzenle`}
                    onPress={() => openAppointment('EditAppointment', item.id)}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                  >
                    <Text style={styles.editText}>Düzenle</Text>
                  </Pressable>
                <View style={styles.actions}>
                  {!completed ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.customerName}: Tamamlandı`}
                      onPress={() => openAppointment('CompleteAppointment', item.id)}
                      style={({ pressed }) => [styles.action, styles.editAction, pressed && styles.pressed]}
                    >
                      <Text style={styles.statusAction}>Tamamlandı</Text>
                    </Pressable>
                  ) : null}

                </View>
              </View>
            </View>
          </SwipeableAppointment>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 },
  header: { marginBottom: 10 },
  separator: { height: 10 },
  empty: {
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: 18, padding: 18, alignItems: 'center', gap: 5,
  },
  emptyIcon: { backgroundColor: colors.sage, borderRadius: 12, padding: 8, marginBottom: 3 },
  emptyTitle: { color: colors.ink, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: 18, paddingHorizontal: 13, paddingTop: 13,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12 },
  timeBox: { backgroundColor: colors.sage, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 10 },
  time: { color: colors.forest, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  customer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, color: colors.ink, fontSize: 16, fontWeight: '700' },
  earnings: { color: colors.forest, fontSize: 14, fontWeight: '700', maxWidth: '40%' },
  cardBottom: {
    borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 3, paddingVertical: 6,
  },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  doneBadge: { backgroundColor: colors.sage },
  waitingBadge: { backgroundColor: colors.amberSoft },
  doneText: { color: colors.forest },
  waitingText: { color: colors.amberInk },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  action: { justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 6, alignItems: 'center' },
  statusAction: { color: colors.forest, fontSize: 15, fontWeight: '800' },
  editAction: { borderColor: '#8AA99B', borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, backgroundColor: colors.sage },
  editText: { color: colors.forest, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.55 },
});
