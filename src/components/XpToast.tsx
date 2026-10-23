import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { duration, ease } from '../lib/motion';
import { useFightStore } from '../store/useFightStore';
import { colors, radius, space } from '../theme';
import { Display } from './ui';

const useNativeDriver = Platform.OS !== 'web';

/** Brief "+XP" pill that slides in from the top after any award. */
export function XpToast() {
  const toast = useFightStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    anim.setValue(0);
    Animated.sequence([
      // Toast (MOTION.md): rises 14 px over 320 ms, dismisses toward its edge over 200 ms.
      Animated.timing(anim, { toValue: 1, duration: duration.default, easing: ease.enter, useNativeDriver }),
      Animated.delay(1600),
      Animated.timing(anim, { toValue: 0, duration: 200, easing: ease.exit, useNativeDriver }),
    ]).start();
  }, [toast, anim]);

  if (!toast) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          top: insets.top + space.sm,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
        },
      ]}
    >
      <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.white} />
      <Display poster size={22} color={colors.white}>
        {toast.text}
      </Display>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.xp,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    transform: [{ skewX: '-10deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 100,
  },
});
