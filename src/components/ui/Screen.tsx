import { Children, isValidElement, useRef, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, MAX_CONTENT_WIDTH, space, WIDE_CONTENT_WIDTH } from '../../theme';
import { useWide } from './Layout';
import { Reveal } from './Motion';
import { Body, Display, Kicker } from './Text';

interface Props {
  title?: string;
  /** One line under the title saying what this screen holds. */
  subtitle?: string;
  /** The corner colour lighting the top of the screen. */
  color?: string;
  /** Small tracked caps above the title. */
  kicker?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  /** Use the full wide-screen width (dashboards); otherwise a readable column. */
  wide?: boolean;
}

export function Screen({ title, subtitle, kicker, color = colors.accent, right, children, scroll = true, wide: wideLayout }: Props) {
  // Each block on the screen rises in turn: 45 ms apart, capped at 270 ms.
  // toArray keys follow each child's original slot, so a block that appears or disappears
  // doesn't remount its neighbours.
  const blocks = Children.toArray(children).map((child, i) => (
    <Reveal key={isValidElement(child) && child.key != null ? child.key : i} index={i + 1}>
      {child}
    </Reveal>
  ));
  const wide = useWide();
  // Scroll-linked: the glow drifts up 8% slower than the content and fades as you leave the top.
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== 'web' });
  const column = [styles.column, wide && styles.columnWide, wide && wideLayout && { maxWidth: WIDE_CONTENT_WIDTH }];
  const header = title ? (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 6 }}>
        {kicker ? <Kicker color={color}>{kicker}</Kicker> : null}
        <Reveal kind="title">
          <Display poster size={wide ? 76 : 58}>
            {title}
          </Display>
        </Reveal>
        {subtitle ? (
          <Body size={15} color={colors.textDim} style={{ maxWidth: 420 }}>
            {subtitle}
          </Body>
        ) : null}
      </View>
      {right}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Ring lights: a red glow from the top right and a slash of red tape across the corner. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            opacity: scrollY.interpolate({ inputRange: [0, 320], outputRange: [1, 0.35], extrapolate: 'clamp' }),
            transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 1000], outputRange: [0, -920], extrapolateLeft: 'clamp' }) }],
          },
        ]}
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="ring" cx="78%" cy="18%" rx="70%" ry="62%" fx="78%" fy="18%">
              <Stop offset="0" stopColor={color} stopOpacity={0.5} />
              <Stop offset="0.45" stopColor={color} stopOpacity={0.16} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#ring)" />
        </Svg>
        <View style={[styles.stripe, { backgroundColor: color }]} />
      </Animated.View>
      {scroll ? (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.scroll, wide && { paddingBottom: space.xxl * 2 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={column}>
            {header}
            {blocks}
          </View>
        </Animated.ScrollView>
      ) : (
        <View style={[column, styles.fill]}>
          {header}
          {blocks}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 520, overflow: 'hidden' },
  stripe: { position: 'absolute', right: -60, top: 22, width: 200, height: 18, transform: [{ rotate: '-14deg' }], opacity: 0.9 },
  scroll: { paddingBottom: 140 },
  column: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: space.lg + 2,
    gap: space.lg,
  },
  columnWide: { paddingHorizontal: space.xxl + 8, gap: space.xl },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: space.xxl + 8, paddingBottom: space.md, gap: space.md },
});
