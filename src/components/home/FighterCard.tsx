import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { addDays, todayKey } from '../../lib/dates';
import { levelProgress, rankTitle } from '../../lib/gamification';
import { useFightStore } from '../../store/useFightStore';
import { colors, space } from '../../theme';
import { Body, CountUp, Display, Kicker, PressableScale, ProgressBar, useTilt, useWide } from '../ui';

/** Up to two initials from the fight name. */
export const monogram = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'F';

/** Weekly targets the hero counts toward. */
export const WEEK_GOALS = { rounds: 30, sessions: 4, streak: 7 };

/** Initials on a red slab, cut at an angle like the buttons. */
export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.red, transform: [{ skewX: '-10deg' }] }]} />
      <Display poster size={size * 0.46}>
        {monogram(name)}
      </Display>
    </View>
  );
}

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

/** The poster line for the streak: what you've done, then what to do about it. */
function headline(streak: number): [string, string] {
  if (streak >= 2) return [`${WORDS[streak] ?? streak} days.`, "Don't stop."];
  if (streak === 1) return ['Day one.', 'Back tomorrow.'];
  return ['Gloves on.', 'Get to work.'];
}

/** The Fighter hero: your streak as a fight-bill headline, this week's numbers, and the way in. */
export function FighterCard() {
  const user = useFightStore((s) => s.user);
  const sessions = useFightStore((s) => s.sessions);
  const { level, into, needed, pct } = levelProgress(user.xp);
  const wide = useWide();
  const tilt = useTilt();

  const week = useMemo(() => {
    const from = addDays(todayKey(), -6);
    const recent = sessions.filter((s) => s.date >= from);
    return { rounds: recent.reduce((n, s) => n + s.rounds, 0), sessions: recent.length };
  }, [sessions]);

  const [said, push] = headline(user.streak);
  const left = WEEK_GOALS.rounds - week.rounds;
  const sub =
    left > 0
      ? `${week.rounds} rounds this week. ${left} more and you hit your goal.`
      : `${week.rounds} rounds this week. Goal hit. Keep stacking.`;
  const size = wide ? 112 : 84;

  return (
    <View style={styles.hero}>
      <View style={styles.top}>
        <Kicker>
          Level {level} · {rankTitle(level)}
        </Kicker>
        <PressableScale to={0.94} onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Edit your fighter" innerStyle={styles.me}>
          <Kicker color={colors.textDim}>{user.name}</Kicker>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textDim} />
        </PressableScale>
      </View>

      {/* The headline leans toward your cursor or with your phone. */}
      <Animated.View style={{ transform: tilt.transform }}>
        <Display poster size={size}>
          {said}
        </Display>
        <Display poster size={size} color={colors.red}>
          {push}
        </Display>
      </Animated.View>

      <Body size={16} color={colors.textDim} style={{ maxWidth: 320 }}>
        {sub}
      </Body>

      <View style={styles.stats}>
        {[
          ['Rounds', week.rounds],
          ['Sessions', week.sessions],
          ['XP', user.xp],
        ].map(([label, value]) => (
          <View key={label}>
            <Display poster size={wide ? 56 : 46}>
              <CountUp value={value as number} />
            </Display>
            <Kicker size={13} color={colors.textMute}>
              {label}
            </Kicker>
          </View>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <ProgressBar pct={pct} height={3} />
        <Kicker size={12} color={colors.textMute}>
          {(needed - into).toLocaleString()} XP to level {level + 1}
        </Kicker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.lg, paddingTop: space.xxl },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -4 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 40 },
  stats: { flexDirection: 'row', gap: 28, marginTop: space.md },
});
