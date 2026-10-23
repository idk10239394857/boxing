import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { Bands, Body, Card, Display, Label, ProgressBar, Stepper } from '../../components/ui';
import { PUNCH_TYPES } from '../../data/sessionTypes';
import { colors, radius, space } from '../../theme';
import { spring } from '../../lib/motion';
import type { TrackEvent } from './detector';
import type { TallyState } from './session';
import type { PunchType } from '../../types';
import type { BodyQuality } from './types';

const useNativeDriver = Platform.OS !== 'web';

/** Big "JAB!" callout that pops on every detected event. */
export function StrikeFlash({ event, combo, corner }: { event: TrackEvent | null; combo: number; corner?: { name: string; color: string } }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!event) return;
    anim.setValue(0);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, ...spring, useNativeDriver }),
      Animated.delay(450),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver }),
    ]).start();
  }, [event, anim]);
  if (!event) return null;
  const isDefense = event.kind === 'defense';
  const tone = event.kind === 'strike' ? PUNCH_TYPES.find((p) => p.id === event.punch)?.color ?? colors.text : colors.silver;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flash,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      <View style={[styles.plate, { backgroundColor: tone }]}>
        {corner ? <View style={[styles.cornerTag, { backgroundColor: corner.color }]} /> : null}
        <Display size={34} color={colors.ink}>
          {event.label}
        </Display>
        {!isDefense && combo >= 2 ? (
          <Label size={14} color={colors.ink}>
            {combo}-punch combo
          </Label>
        ) : null}
      </View>
    </Animated.View>
  );
}

const QUALITY = {
  good: { icon: 'check-circle', color: colors.success, text: 'Full body' },
  partial: { icon: 'alert', color: colors.warning, text: 'Step back: show your whole body' },
  none: { icon: 'account-question', color: colors.danger, text: 'No fighter found' },
} as const;

export function QualityPill({ quality }: { quality: BodyQuality }) {
  const q = QUALITY[quality];
  return (
    <View style={styles.pill}>
      <MaterialCommunityIcons name={q.icon} size={14} color={q.color} />
      <Label size={12} color={colors.text}>
        {q.text}
      </Label>
    </View>
  );
}

/** Live counters per punch type. */
export function TallyRow({ tally, corner }: { tally: TallyState; corner?: { name: string; color: string } }) {
  return (
    <View style={[styles.tally, corner && { borderColor: corner.color }]}>
      {corner ? (
        <View style={[styles.tallyCell, { flex: 0.8 }]}>
          <View style={[styles.cornerDot, { backgroundColor: corner.color }]} />
          <Label size={11} color={colors.text}>
            {corner.name}
          </Label>
        </View>
      ) : null}
      {PUNCH_TYPES.map((p) => (
        <View key={p.id} style={styles.tallyCell}>
          <Display size={28} color={tally.punches[p.id] ? colors.text : colors.textMute}>
            {tally.punches[p.id]}
          </Display>
          <View style={[styles.tick, { backgroundColor: p.color }]} />
          <Label size={11}>{p.label}</Label>
        </View>
      ))}
      <View style={styles.tallyCell}>
        <Display size={28} color={tally.defense ? colors.text : colors.textMute}>
          {tally.defense}
        </Display>
        <View style={[styles.tick, { backgroundColor: colors.silver }]} />
        <Label size={11}>Defense</Label>
      </View>
    </View>
  );
}

export function EventFeed({ events }: { events: TrackEvent[] }) {
  const recent = events.slice(-6).reverse();
  if (!recent.length) return <Body color={colors.textDim}>Throw something. Every punch and slip shows up here.</Body>;
  return (
    <View style={{ gap: 6 }}>
      {recent.map((e, i) => (
        <View key={`${e.t}-${i}`} style={[styles.feedRow, { opacity: 1 - i * 0.13 }]}>
          <View style={[styles.feedSwatch, { backgroundColor: e.kind === 'strike' ? PUNCH_TYPES.find((p) => p.id === e.punch)?.color : colors.silver }]} />
          <Display size={16} style={{ flex: 1 }}>
            {e.label}
          </Display>
          {e.kind === 'strike' ? <Label>{e.speed.toFixed(1)} m/s</Label> : <Label>Defense</Label>}
        </View>
      ))}
    </View>
  );
}

export function SummaryCard({ tally, seconds, counts }: { tally: TallyState; seconds: number; counts: Record<PunchType, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const minutes = Math.max(seconds / 60, 1 / 60);
  const strikes = tally.events.filter((e) => e.kind === 'strike');
  const fastest = strikes.reduce((m, e) => Math.max(m, e.kind === 'strike' ? e.speed : 0), 0);
  return (
    <Card style={{ gap: space.lg }}>
      <View style={styles.summaryTop}>
        <View style={{ flex: 1 }}>
          <Display size={72} color={colors.text}>
            {total}
          </Display>
          <Label>Punches thrown</Label>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Display size={22}>{Math.round(total / minutes)} / min</Display>
          <Display size={22}>{tally.bestCombo}× best combo</Display>
          <Display size={22}>{tally.defense} defense</Display>
          {fastest ? <Label>Fastest hand {fastest.toFixed(1)} m/s</Label> : null}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Bands height={12} parts={PUNCH_TYPES.map((p) => ({ value: counts[p.id], color: p.color }))} />
        {PUNCH_TYPES.map((p) => (
          <View key={p.id} style={styles.barRow}>
            <Label color={colors.text} style={{ width: 72 }}>
              {p.label}
            </Label>
            <View style={{ flex: 1 }}>
              <ProgressBar pct={total ? counts[p.id] / total : 0} color={p.color} height={8} />
            </View>
            <Display size={16} style={{ width: 36, textAlign: 'right' }}>
              {counts[p.id]}
            </Display>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flash: { position: 'absolute', bottom: 18, left: 0, right: 0, alignItems: 'center' },
  plate: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.md },
  cornerTag: { width: 12, height: 12, borderRadius: 2, borderWidth: 2, borderColor: colors.ink },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7, 16, 31, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  tally: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: space.md },
  tallyCell: { flex: 1, alignItems: 'center', gap: 3 },
  tick: { width: 20, height: 3, borderRadius: 1 },
  cornerDot: { width: 14, height: 14, borderRadius: 2, marginTop: 8 },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 40, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  feedSwatch: { width: 10, height: 10, borderRadius: 2 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});

/** Let the fighter fix what the camera got wrong before it's logged. */
export function CountEditor({ counts, onChange }: { counts: Record<PunchType, number>; onChange: (c: Record<PunchType, number>) => void }) {
  return (
    <Card style={{ gap: space.md }}>
      <View>
        <Display size={18}>Check the count</Display>
        <Label>Camera tracking can mix up hooks and straights. Fix anything before saving.</Label>
      </View>
      {PUNCH_TYPES.map((p) => (
        <View key={p.id} style={styles.barRow}>
          <View style={[styles.feedSwatch, { backgroundColor: p.color }]} />
          <Display size={16} style={{ flex: 1 }}>
            {p.label}
          </Display>
          <Stepper compact value={counts[p.id]} max={9999} onChange={(n) => onChange({ ...counts, [p.id]: n })} />
        </View>
      ))}
    </Card>
  );
}
