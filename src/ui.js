import { Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = {
  canvas: '#F5F3ED',
  surface: '#FFFEFA',
  ink: '#192A23',
  muted: '#596860',
  line: '#DDDCD1',
  forest: '#193C32',
  sage: '#E5EEE6',
  amber: '#F3CF9B',
  amberSoft: '#F8EAD5',
  amberInk: '#68431A',
  danger: '#9F392D',
};

export function Icon({ name, color = colors.forest }) {
  if (name === 'earnings') {
    return (
      <View style={icon.frame}>
        <Text allowFontScaling={false} style={[icon.earnings, { color }]}>₺</Text>
      </View>
    );
  }

  if (name === 'plus') {
    return (
      <View style={icon.frame}>
        <View style={[icon.plusHorizontal, { backgroundColor: color }]} />
        <View style={[icon.plusVertical, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={icon.frame}>
      {name === 'calendar' ? (
        <View style={[icon.calendar, { borderColor: color }]}>
          <View style={[icon.calendarRule, { backgroundColor: color }]} />
          <View style={[icon.calendarPin, { backgroundColor: color, left: 2 }]} />
          <View style={[icon.calendarPin, { backgroundColor: color, right: 2 }]} />
        </View>
      ) : (
        <View style={[icon.clock, { borderColor: color }]}>
          <View style={[icon.clockHand, { borderColor: color }]} />
        </View>
      )}
    </View>
  );
}

/** @param {{label: string, onPress: () => void, iconName?: string, tone?: string, disabled?: boolean}} props */
export function ActionButton({ label, onPress, iconName = undefined, tone = 'primary', disabled = false }) {
  const foreground = tone === 'primary' ? colors.surface : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        button.base,
        tone === 'primary' ? button.primary : button.accent,
        pressed && button.pressed,
        disabled && button.pressed,
      ]}
    >
      {iconName ? <Icon name={iconName} color={foreground} /> : null}
      <Text style={[button.label, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

const icon = StyleSheet.create({
  frame: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  earnings: { fontSize: 19, fontWeight: '800', includeFontPadding: false },
  plusHorizontal: { position: 'absolute', width: 14, height: 2, borderRadius: 1 },
  plusVertical: { position: 'absolute', width: 2, height: 14, borderRadius: 1 },
  calendar: { width: 16, height: 15, borderRadius: 3, borderWidth: 1.6 },
  calendarRule: { height: 1.5, marginTop: 3 },
  calendarPin: { position: 'absolute', top: -3, width: 1.6, height: 4, borderRadius: 1 },
  clock: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.6 },
  clockHand: {
    position: 'absolute', top: 2, left: 6, width: 4, height: 6,
    borderLeftWidth: 1.6, borderBottomWidth: 1.6,
  },
});

const button = StyleSheet.create({
  base: {
    minHeight: 50, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primary: { backgroundColor: colors.forest },
  accent: { backgroundColor: colors.amber },
  pressed: { opacity: 0.78 },
  label: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
});
