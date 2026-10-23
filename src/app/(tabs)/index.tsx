import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Achievements } from '../../components/home/Achievements';
import { FighterCard } from '../../components/home/FighterCard';
import { WeeklyChart } from '../../components/home/WeeklyChart';
import { SessionRow } from '../../components/SessionRow';
import { Body, Button, Columns, Kicker, Screen, SectionHeader, useWide } from '../../components/ui';
import { quoteOfTheDay } from '../../data/quotes';
import { useFightStore } from '../../store/useFightStore';
import { colors, space, tabColor } from '../../theme';

export default function HomeScreen() {
  const sessions = useFightStore((s) => s.sessions);
  const recent = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 3),
    [sessions],
  );
  const quote = quoteOfTheDay();
  const wide = useWide();

  return (
    <Screen color={tabColor.index} wide>
      <Columns
        left={
          <>
            <FighterCard />

            <View style={{ gap: 10, marginTop: space.md }}>
              <Button label="Log training" size="lg" onPress={() => router.push('/log-session')} />
              <View style={styles.pair}>
                <Button label="Shadow Cam" variant="ghost" icon="cctv" onPress={() => router.push('/track')} style={{ flex: 1 }} />
                <Button label="Round timer" variant="ghost" icon="timer-outline" onPress={() => router.push('/timer')} style={{ flex: 1 }} />
              </View>
            </View>
          </>
        }
        right={
          <>
            <View style={{ marginTop: wide ? space.xxl * 2 : space.xl }}>
              <WeeklyChart />
            </View>

            <SectionHeader title="Recent" right="Last 3" />
            <View>
              {recent.length ? (
                recent.map((s) => <SessionRow key={s.id} session={s} showDate />)
              ) : (
                <Body color={colors.textDim}>No sessions yet. Log your first one and your week fills in.</Body>
              )}
            </View>

            {wide ? <Achievements /> : null}
          </>
        }
      />

      {wide ? null : <Achievements />}

      <View style={styles.quote}>
        <Body size={20} color={colors.text} style={styles.quoteText}>
          “{quote.text}”
        </Body>
        <Kicker color={colors.textMute}>{quote.by}</Kicker>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 10 },
  quote: { gap: space.md, marginTop: space.xxl, paddingVertical: space.xs, borderLeftWidth: 3, borderLeftColor: colors.red, paddingLeft: space.lg },
  quoteText: { fontStyle: 'italic', lineHeight: 28 },
});
