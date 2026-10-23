import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme';
import { gradientFor } from './Controls';

const clamp = (n: number) => Math.max(0, Math.min(1, n || 0));
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** 0 → `to` once on mount (or straight to `to` with reduced motion), then follows changes. */
function useFill(to: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!alive) return;
        if (reduce) v.setValue(to);
        else Animated.timing(v, { toValue: to, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      });
    return () => {
      alive = false;
    };
  }, [to, v]);
  return v;
}

export function ProgressBar({ pct, color = colors.accent, height = 8 }: { pct: number; color?: string; height?: number }) {
  const fill = useFill(clamp(pct));
  return (
    <View style={[styles.track, { height }]}>
      <Animated.View style={{ width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), height, backgroundColor: color }} />
    </View>
  );
}

/**
 * A count drawn as discrete pills (rounds in a session, tenths of a level). `filled` may be
 * fractional: the next pill fills partway.
 */
export function Segments({
  count,
  filled,
  color = colors.accent,
  height = 8,
  gap = 3,
  current,
}: {
  count: number;
  filled: number;
  color?: string;
  height?: number;
  gap?: number;
  /** Outline this segment (the round in progress). */
  current?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap, height }}>
      {Array.from({ length: Math.max(1, count) }, (_, i) => {
        const f = Math.max(0, Math.min(1, filled - i));
        return (
          <View
            key={i}
            style={[
              { flex: 1, backgroundColor: '#1C1C1C', overflow: 'hidden', transform: [{ skewX: '-12deg' }] },
              i === current && { borderWidth: 2, borderColor: color },
            ]}
          >
            {f > 0 ? <View style={{ width: `${f * 100}%`, height: '100%', backgroundColor: color }} /> : null}
          </View>
        );
      })}
    </View>
  );
}

/** Parts stacked into one rounded bar, each in its own colour. */
export function Bands({ parts, height = 10, total }: { parts: { value: number; color: string }[]; height?: number; total?: number }) {
  const sum = total ?? parts.reduce((n, p) => n + p.value, 0);
  return (
    <View style={[styles.bands, { height }]}>
      {sum > 0
        ? parts.filter((p) => p.value > 0).map((p, i) => <View key={i} style={{ flex: p.value / sum, backgroundColor: p.color }} />)
        : null}
      {total && total > sum ? <View style={{ flex: (total - sum) / total }} /> : null}
    </View>
  );
}

interface RingSegment {
  value: number;
  color: string;
}

interface RingProps {
  size?: number;
  stroke?: number;
  /** Single-value ring (0–1)… */
  pct?: number;
  color?: string;
  /** …or a multi-segment distribution ring. */
  segments?: RingSegment[];
  children?: ReactNode;
}

/** One ring: a tinted track and a lit, round-capped arc that sweeps in. */
function Arc({ size, stroke, pct, color, inset = 0, id }: { size: number; stroke: number; pct: number; color: string; inset?: number; id: string }) {
  const r = (size - stroke) / 2 - inset;
  const c = 2 * Math.PI * r;
  const fill = useFill(clamp(pct));
  const [a, b] = gradientFor(color);
  return (
    <>
      <Defs>
        <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={a} />
          <Stop offset="1" stopColor={b} />
        </SvgGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeOpacity={0.16} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={`url(#${id})`}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="butt"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={fill.interpolate({ inputRange: [0, 1], outputRange: [c, 0] })}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </>
  );
}

let ringIds = 0;

export function ProgressRing({ size = 72, stroke = 8, pct = 0, color = colors.accent, segments, children }: RingProps) {
  const id = useRef(`ring${ringIds++}`).current;
  if (!segments) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Arc size={size} stroke={stroke} pct={pct} color={color} id={id} />
        </Svg>
        {children}
      </View>
    );
  }
  // A distribution: consecutive arcs with small gaps between them.
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((n, p) => n + p.value, 0) || 1;
  const gap = segments.filter((s) => s.value > 0).length > 1 ? stroke * 0.9 : 0;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={stroke} fill="none" />
        {segments.map((p, i) => {
          const len = (p.value / total) * c;
          const dash = Math.max(0, len - gap);
          const el = (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={p.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return dash > 0 ? el : null;
        })}
      </Svg>
      {children}
    </View>
  );
}

/** Apple-style concentric activity rings, outermost first. */
export function ActivityRings({ rings, size = 150, stroke = 16, children }: { rings: { pct: number; color: string }[]; size?: number; stroke?: number; children?: ReactNode }) {
  const id = useRef(`rings${ringIds++}`).current;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {rings.map((r, i) => (
          <Arc key={i} size={size} stroke={stroke} pct={r.pct} color={r.color} inset={i * (stroke + 3)} id={`${id}-${i}`} />
        ))}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', backgroundColor: '#1C1C1C', overflow: 'hidden' },
  bands: { flexDirection: 'row', gap: 3, width: '100%', overflow: 'hidden' },
});
