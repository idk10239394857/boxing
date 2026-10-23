import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { duration, ease, spring, stagger, useReducedMotion } from '../../lib/motion';

const MAX_TILT = 5; // degrees

const native = Platform.OS !== 'web';

/**
 * Entrance choreography (MOTION.md): cards rise 20 px and fade in over 320 ms with a 45 ms
 * stagger, the hero title 28 px over 560 ms, list items 10 px with a 35 ms stagger. Replays when
 * the screen comes back into focus. Reduced motion: a 120 ms fade only.
 */
export function Reveal({ index = 0, kind = 'card', style, children }: { index?: number; kind?: 'card' | 'title' | 'item'; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();
  const focused = useFocusSafe();
  useEffect(() => {
    if (!focused) return;
    v.setValue(0);
    const delay = kind === 'item' ? index * stagger.item : Math.min(index * stagger.card, stagger.cardMax);
    Animated.timing(v, {
      toValue: 1,
      duration: reduce ? 120 : kind === 'title' ? duration.slow : duration.default,
      delay: reduce ? 0 : delay,
      easing: ease.enter,
      useNativeDriver: native,
    }).start();
  }, [focused, reduce, index, kind, v]);
  const dy = kind === 'title' ? 28 : kind === 'item' ? 10 : 20;
  return (
    <Animated.View style={[style, { opacity: v, transform: reduce ? [] : [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Focus state outside a navigator (modals render Reveal too) falls back to "focused". */
function useFocusSafe() {
  try {
    return useIsFocused();
  } catch {
    return true;
  }
}

/**
 * Press feedback on press-down, instantly: surfaces scale to 0.985, buttons to 0.96, and release
 * on Apple's critically damped spring from wherever the press left them.
 */
export function PressableScale({
  to = 0.985,
  style,
  innerStyle,
  children,
  ...rest
}: PressableProps & {
  to?: number;
  /** Layout of the pressable (flex, width, margins). */
  style?: StyleProp<ViewStyle>;
  /** The surface that scales (background, radius, padding). */
  innerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const reduce = useReducedMotion();
  const go = (toValue: number) => {
    s.stopAnimation();
    Animated.spring(s, { toValue, ...spring, useNativeDriver: native }).start();
  };
  return (
    <Pressable
      {...rest}
      style={style}
      onPressIn={(e) => (reduce ? null : go(to), rest.onPressIn?.(e))}
      onPressOut={(e) => (go(1), rest.onPressOut?.(e))}
    >
      <Animated.View style={[innerStyle, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** A number that counts up to its value with the fluid curve (560 ms); instant with reduced motion. */
export function CountUp({ value, style, format = (n) => Math.round(n).toLocaleString() }: { value: number; style?: StyleProp<TextStyle>; format?: (n: number) => string }) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  const reduce = useReducedMotion();
  const focused = useFocusSafe();
  useEffect(() => {
    if (!focused) return;
    if (reduce) return setShown(value);
    const id = v.addListener(({ value: n }) => setShown(n));
    v.setValue(0);
    Animated.timing(v, { toValue: value, duration: duration.slow + 240, easing: ease.fluid, useNativeDriver: false }).start(() => setShown(value));
    return () => v.removeListener(id);
  }, [value, reduce, focused, v]);
  return <Text style={style}>{format(shown)}</Text>;
}

/**
 * The surface leans toward the pointer (laptop) or with the phone's tilt, following on Apple's
 * spring so it never jumps. Returns a transform to spread into a style. Web only; off with
 * reduced motion.
 */
export function useTilt() {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();
  useEffect(() => {
    if (Platform.OS !== 'web' || reduce || typeof window === 'undefined') return;
    const to = (x: number, y: number) => {
      const clamp = (n: number) => Math.max(-1, Math.min(1, n));
      Animated.spring(tx, { toValue: clamp(x), ...spring, useNativeDriver: false }).start();
      Animated.spring(ty, { toValue: clamp(y), ...spring, useNativeDriver: false }).start();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      to((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    // Phone tilt relative to how it was held when the screen opened.
    let base: { b: number; g: number } | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      base ??= { b: e.beta, g: e.gamma };
      to((e.gamma - base.g) / 20, (e.beta - base.b) / 20);
    };
    const reset = () => to(0, 0);
    window.addEventListener('pointermove', onPointer);
    window.addEventListener('deviceorientation', onOrient);
    document.addEventListener('pointerleave', reset);
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onOrient);
      document.removeEventListener('pointerleave', reset);
    };
  }, [reduce, tx, ty]);
  return {
    transform: [
      { perspective: 900 },
      { rotateY: tx.interpolate({ inputRange: [-1, 1], outputRange: [`-${MAX_TILT}deg`, `${MAX_TILT}deg`] }) },
      { rotateX: ty.interpolate({ inputRange: [-1, 1], outputRange: [`${MAX_TILT}deg`, `-${MAX_TILT}deg`] }) },
    ],
    /** For a layer that should drift the other way (parallax), at most 8 px. */
    drift: {
      transform: [
        { translateX: tx.interpolate({ inputRange: [-1, 1], outputRange: [8, -8] }) },
        { translateY: ty.interpolate({ inputRange: [-1, 1], outputRange: [8, -8] }) },
      ],
    },
  };
}
