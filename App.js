import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import AddAppointmentScreen from './src/screens/AddAppointmentScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import CompleteAppointmentScreen from './src/screens/CompleteAppointmentScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import FinancialRecordsScreen from './src/screens/FinancialRecordsScreen';
import EditFinancialRecordScreen from './src/screens/EditFinancialRecordScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import { useToday } from './src/dates';
import brandIcon from './assets/salonum-brand.png';
import { useStore } from './src/store/useStore';
import { getStorageError } from './src/store/commitStorage';
import { CalendarDateError } from './src/retention';
import { ActionButton, colors, Icon } from './src/ui';

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const tabIcons = { Today: 'clock', Calendar: 'calendar', Earnings: 'earnings' };

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.forest,
    background: colors.canvas,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
  },
};

function Brand() {
  return (
    <View style={styles.brand}>
      <Image source={brandIcon} style={styles.brandMark} />
      <Text accessibilityRole="header" style={styles.brandName}>Salon Makas - Celal Ertürk</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerTitle: () => <Brand />,
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.canvas },
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
            <Icon name={tabIcons[route.name]} color={color} />
          </View>
        ),
      })}
    >
      <Tabs.Screen name="Today" component={HomeScreen} options={{ title: 'Bugün' }} />
      <Tabs.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Takvim' }} />
      <Tabs.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Kazanç' }} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const [storageState, setStorageState] = useState('loading');
  const [recoveryError, setRecoveryError] = useState('');
  const today = useToday();

  useEffect(() => {
    if (storageState !== 'loading') return;
    let active = true;

    async function restoreAppointments() {
      try {
        await useStore.persist.rehydrate();
        if (active) setStorageState(useStore.persist.hasHydrated() ? 'ready' : 'error');
      } catch {
        if (active) setStorageState('error');
      }
    }

    restoreAppointments();
    return () => { active = false; };
  }, [storageState]);

  useEffect(() => {
    if (storageState !== 'ready') return;
    let active = true;
    async function cleanup() {
      if (!active) return;
      try {
        await useStore.getState().removePastAppointments(today);
        await useStore.getState().maintainCalendar();
      } catch (error) {
        if (error instanceof CalendarDateError) { if (active) setStorageState('loading'); return; }
        if (active) Alert.alert('Yerel bakım tamamlanamadı', 'Telefonun tarihini ve boş alanını kontrol edin.', [
          { text: 'Daha sonra', style: 'cancel' },
          { text: 'Tekrar dene', onPress: cleanup },
        ]);
      }
    }
    cleanup();
    return () => { active = false; };
  }, [storageState, today]);

  async function recoverLocal() {
    try { await useStore.getState().recoverLocal(); setRecoveryError(''); setStorageState('loading'); }
    catch { setRecoveryError('Doğrulanmış yerel kayıt bulunamadı. Mevcut dosyalar silinmedi.'); }
  }
  function confirmDate() {
    Alert.alert('Telefon tarihini doğrula', 'Telefon tarihi doğruysa devam edin. Yalnızca bu yılın ayrıntıları ve geçen yılın özetleri tutulacak; daha eski mali kayıtlar silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Tarih doğru', onPress: () => { useStore.getState().confirmCalendarDate(); setStorageState('loading'); } },
    ]);
  }

  if (storageState !== 'ready') {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        {storageState === 'loading' ? (
          <ActivityIndicator accessibilityLabel="Randevular yükleniyor" color={colors.forest} />
        ) : (
          <>
            <Text style={styles.error}>{getStorageError()?.message || 'Yerel kayıtlar okunamadı. Dosyalar korundu.'}</Text>
            {recoveryError ? <Text style={styles.error}>{recoveryError}</Text> : null}
            <ActionButton label="Tekrar dene" onPress={() => setStorageState('loading')} />
            <ActionButton label="Yerel kaydı doğrula ve kurtar" tone="accent" onPress={recoverLocal} />
            {getStorageError() instanceof CalendarDateError ? <ActionButton label="Telefon tarihini doğrula" tone="accent" onPress={confirmDate} /> : null}
          </>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.ink,
      }}>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="AddAppointment"
          component={AddAppointmentScreen}
          options={{ title: 'Randevu ekle', presentation: 'modal' }}
        />
        <Stack.Screen
          name="EditAppointment"
          component={AddAppointmentScreen}
          options={{ title: 'Randevuyu düzenle', presentation: 'modal' }}
        />
        <Stack.Screen
          name="CompleteAppointment"
          component={CompleteAppointmentScreen}
          options={{ title: 'Randevuyu tamamla', presentation: 'modal' }}
        />
        <Stack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{ title: 'Gider ekle', presentation: 'modal' }}
        />
        <Stack.Screen
          name="FinancialRecords"
          component={FinancialRecordsScreen}
          options={{ title: 'Gelir ve gider kayıtları' }}
        />
        <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Mali rapor' }} />
        <Stack.Screen
          name="EditFinancialRecord"
          component={EditFinancialRecordScreen}
          options={{ title: 'Mali kaydı düzenle', presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingRight: 12 },
  brandMark: {
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
    borderRadius: 9, backgroundColor: colors.forest,
  },
  brandLetter: { color: colors.amber, fontSize: 18, fontWeight: '800' },
  brandName: { color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.4, flexShrink: 1 },
  tabBar: { backgroundColor: colors.surface, borderTopColor: colors.line },
  tabItem: { paddingVertical: 2 },
  tabIcon: { minWidth: 44, alignItems: 'center', borderRadius: 14, padding: 3 },
  tabIconActive: { backgroundColor: colors.sage },
  tabLabel: { fontSize: 12, fontWeight: '700' },
  center: {
    flex: 1, backgroundColor: colors.canvas, alignItems: 'center',
    justifyContent: 'center', gap: 16, padding: 24,
  },
  error: { color: colors.ink, textAlign: 'center' },
});
