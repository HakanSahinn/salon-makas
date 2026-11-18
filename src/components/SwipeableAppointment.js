import { useCallback, useEffect, useMemo } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, useAnimatedValue, View } from 'react-native';
import { colors } from '../ui';

const actionWidth = 80;

export function SwipeableAppointment({ children, expanded, onExpandedChange, onDelete, deleteLabel }) {
  const offset = useAnimatedValue(expanded ? -actionWidth : 0);
  const settle = useCallback((open) => {
    Animated.timing(offset, {
      toValue: open ? -actionWidth : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [offset]);

  useEffect(() => {
    settle(expanded);
  }, [expanded, settle]);

  const gesture = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
      Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3 && (expanded || dx < 0),
    onPanResponderGrant: () => offset.stopAnimation(),
    onPanResponderMove: (_, { dx }) => {
      const start = expanded ? -actionWidth : 0;
      offset.setValue(Math.max(-actionWidth, Math.min(0, start + dx)));
    },
    onPanResponderRelease: (_, { dx }) => {
      const open = expanded ? dx < actionWidth / 2 : dx < -actionWidth / 2;
      if (open === expanded) settle(open);
      else onExpandedChange(open);
    },
    onPanResponderTerminate: () => settle(expanded),
  }), [expanded, offset, onExpandedChange, settle]);

  return (
    <View style={styles.frame}>
      <View pointerEvents={expanded ? 'auto' : 'none'} style={styles.action}>
        {expanded ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={deleteLabel}
            onPress={onDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Text style={styles.deleteText}>Sil</Text>
          </Pressable>
        ) : null}
      </View>
      <Animated.View {...gesture.panHandlers} style={{ transform: [{ translateX: offset }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 18, overflow: 'hidden' },
  action: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: actionWidth,
    backgroundColor: colors.danger, borderTopRightRadius: 18, borderBottomRightRadius: 18,
  },
  deleteButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
