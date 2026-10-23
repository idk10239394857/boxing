import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MonthGrid } from '../../components/calendar/MonthGrid';
import { SwipePager } from '../../components/calendar/SwipePager';
import { SessionRow } from '../../components/SessionRow';
import { Body, Button, Card, Columns, Display, IconButton, Label, Screen, StatBlock } from '../../components/ui';
import { formatLong, MONTHS, todayKey } from '../../lib/dates';
import { useFightStore } from '../../store/useFightStore';
import { colors, space, tabColor } from '../../theme';

export default function CalendarScreen() {
  const sessions = useFightStore((s) => s.sessions);
  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selected, setSelected] = useState(todayKey());

  const trainedDays = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) m.set(s.date, (m.get(s.date) ?? 0) + 1);
    return m;
  }, [sessions]);

  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const monthSessions = sessions.filter((s) => s.date.startsWith(monthPrefix));
  const monthDays = new Set(monthSessions.map((s) => s.date)).size;
  const daySessions = sessions.filter((s) => s.date === selected);
  const canLog = selected <= todayKey();

  const [from, setFrom] = useState<-1 | 0 | 1>(0);
  const shift = (delta: 1 | -1) => {
    setFrom(delta);
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <Screen kicker="Training log" title="Calendar" subtitle="Every session, day by day" color={tabColor.calendar} wide>
      <Columns
        ratio={1.15}
        left={
          <Card style={{ gap: space.md }}>
            <View style={styles.nav}>
              <IconButton icon="chevron-left" label="Previous month" onPress={() => shift(-1)} />
              <Display size={20} style={{ flex: 1 }} align="center">
                {MONTHS[cursor.month]} {cursor.year}
              </Display>
              <IconButton icon="chevron-right" label="Next month" onPress={() => shift(1)} />
            </View>
            <SwipePager pageKey={`${cursor.year}-${cursor.month}`} from={from} onPage={shift}>
              <MonthGrid {...cursor} trainedDays={trainedDays} selected={selected} onSelect={setSelected} />
            </SwipePager>
            <View style={styles.summary}>
              <StatBlock label="Days trained" value={monthDays} size={28} />
              <StatBlock label="Sessions" value={monthSessions.length} size={28} />
              <StatBlock label="Rounds" value={monthSessions.reduce((n, s) => n + s.rounds, 0)} size={28} />
            </View>
          </Card>
        }
        right={
          <>
            <View style={styles.dayHead}>
              <View style={{ flex: 1, gap: 2 }}>
                <Display size={22}>{formatLong(selected)}</Display>
                <Label>
                  {selected === todayKey()
                    ? 'Today'
                    : daySessions.length
                      ? `${daySessions.length} session${daySessions.length > 1 ? 's' : ''}`
                      : 'No sessions'}
                </Label>
              </View>
              {canLog ? (
                <Button
                  label="Log"
                  icon="plus"
                  onPress={() =>
                    router.push({
                      pathname: '/log-session',
                      params: { date: selected },
                    })
                  }
                />
              ) : null}
            </View>
            <View>
              {daySessions.length ? (
                daySessions.map((s) => <SessionRow key={s.id} session={s} deletable />)
              ) : (
                <Body color={colors.textDim}>{canLog ? 'Rest day. Recovery is training too.' : 'Upcoming.'}</Body>
              )}
            </View>
          </>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center' },
  summary: {
    flexDirection: 'row',
    gap: space.md,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.sm,
  },
});
