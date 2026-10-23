import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors } from '../theme';

const PALETTE = [colors.white, colors.red, colors.orange, colors.gold, colors.steel];
const COUNT = 60;
const useNativeDriver = Platform.OS !== 'web';

export function Confetti() {
  const { width, height } = useWindowDimensions();
  const progress = useRef(Array.from({ length: COUNT }, () => new Animated.Value(0))).current;

  const pieces = useMemo(
    () =>
      progress.map((_, i) => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 160,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720),
        size: 6 + Math.random() * 8,
        color: PALETTE[i % PALETTE.length],
        delay: Math.random() * 600,
        duration: 1800 + Math.random() * 1600,
      })),
    [progress, width],
  );

  useEffect(() => {
    Animated.parallel(
      progress.map((v, i) =>
        Animated.timing(v, {
          toValue: 1,
          duration: pieces[i].duration,
          delay: pieces[i].delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }),
      ),
    ).start();
  }, [progress, pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.size * 0.45,
            backgroundColor: p.color,
            opacity: progress[i].interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: progress[i].interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
              { translateX: progress[i].interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: progress[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
