import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { addDays, fromDateKey, todayKey } from '../../lib/dates';
import { useFightStore } from '../../store/useFightStore';
import { colors, space } from '../../theme';
import { Display, Kicker } from '../ui';

const CHART_H = 96;

/** Rounds per day for the last seven days: hard-edged columns, today in red. */
export function WeeklyChart() {
  const sessions = useFightStore((s) => s.sessions);
  const days = useMemo(() => {
    const today = todayKey();
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDays(today, i - 6);
      const rounds = sessions.filter((s) => s.date === key).reduce((n, s) => n + s.rounds, 0);
      return { key, isToday: key === today, rounds, label: fromDateKey(key).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1) };
    });
  }, [sessions]);

  const max = Math.max(8, ...days.map((d) => d.rounds));
  const total = days.reduce((n, d) => n + d.rounds, 0);

  return (
    <View style={{ gap: space.lg }}>
      <View style={styles.head}>
        <Kicker color={colors.textDim}>Last 7 days</Kicker>
        <Display poster size={22}>
          {total} rounds
        </Display>
      </View>

      <View style={styles.chart}>
        {days.map((d) => (
          <View key={d.key} style={styles.col} accessibilityLabel={`${d.label}: ${d.rounds} rounds`}>
            <View style={styles.slot}>
              <View
                style={{
                  height: d.rounds ? Math.max(8, (d.rounds / max) * CHART_H) : 5,
                  backgroundColor: d.isToday && d.rounds ? colors.red : d.rounds ? colors.white : '#1C1C1C',
                }}
              />
            </View>
            <Kicker size={12} color={d.isToday ? colors.red : colors.textMute} style={{ letterSpacing: 0 }}>
              {d.isToday ? 'Today' : d.label}
            </Kicker>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  col: { flex: 1, alignItems: 'center', gap: 8 },
  slot: { width: '100%', height: CHART_H, justifyContent: 'flex-end' },
});
