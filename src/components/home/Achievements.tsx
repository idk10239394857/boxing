import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { evaluateAchievements } from '../../lib/achievements';
import { useTotals } from '../../store/selectors';
import { useFightStore } from '../../store/useFightStore';
import { colors, space } from '../../theme';
import { Display, Kicker, Label, ProgressBar, SectionHeader } from '../ui';

export function Achievements() {
  const totals = useTotals();
  const user = useFightStore((s) => s.user);
  const sessions = useFightStore((s) => s.sessions);
  const tiersCompleted = useFightStore((s) => s.tiersCompleted);

  const list = useMemo(
    () =>
      evaluateAchievements({
        sessions: totals.sessions,
        rounds: totals.rounds,
        landed: totals.landed,
        longestStreak: user.longestStreak,
        sparringSessions: sessions.filter((s) => s.type === 'sparring').length,
        techniquesTouched: totals.techniquesTouched,
        tiersCompleted: tiersCompleted.length,
        level: user.level,
      }),
    [totals, user, sessions, tiersCompleted],
  );
  const unlocked = list.filter((a) => a.unlocked).length;

  return (
    <View style={{ gap: space.md }}>
      <SectionHeader title="Trophy case" right={`${unlocked} of ${list.length} earned`} />
      <View style={styles.grid}>
        {list.map((a) => (
          <View key={a.id} style={styles.badge}>
            <MaterialCommunityIcons name={a.icon} size={26} color={a.unlocked ? colors.red : colors.textMute} />
            <View style={{ flex: 1, gap: 4 }}>
              <Display poster size={19} color={a.unlocked ? colors.text : colors.textMute} numberOfLines={1}>
                {a.name}
              </Display>
              {a.unlocked ? (
                <Kicker size={12}>Earned</Kicker>
              ) : (
                <>
                  <ProgressBar pct={a.value / a.goal} height={4} color={colors.textDim} />
                  <Label size={11} color={colors.textMute} numberOfLines={1}>
                    {a.hint} · {a.value}/{a.goal}
                  </Label>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.xl },
  badge: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderHi,
  },
});
