import { StyleSheet, View } from 'react-native';
import { PUNCH_TYPES } from '../../data/sessionTypes';
import { landPct } from '../../store/selectors';
import { useFightStore } from '../../store/useFightStore';
import { colors, space } from '../../theme';
import { Bands, Card, CountUp, Display, Label, ProgressRing } from '../ui';

/** Overall accuracy, totals, and each punch's share of your output. */
export function Distribution() {
  const punches = useFightStore((s) => s.punches);
  const thrown = PUNCH_TYPES.reduce((n, p) => n + punches[p.id].thrown, 0);
  const landed = PUNCH_TYPES.reduce((n, p) => n + punches[p.id].landed, 0);

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <ProgressRing size={148} stroke={14} segments={PUNCH_TYPES.map((p) => ({ value: punches[p.id].thrown, color: p.color }))}>
          <Display size={36}>{landPct({ thrown, landed })}%</Display>
          <Label>Landed</Label>
        </ProgressRing>
        <View style={{ flex: 1, gap: space.lg }}>
          <View>
            <Display size={36}>
              <CountUp value={thrown} />
            </Display>
            <Label>Thrown</Label>
          </View>
          <View>
            <Display size={36}>
              <CountUp value={landed} />
            </Display>
            <Label>Landed</Label>
          </View>
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <Bands height={12} parts={PUNCH_TYPES.map((p) => ({ value: punches[p.id].thrown, color: p.color }))} />
        <View style={styles.legend}>
          {PUNCH_TYPES.map((p) => (
            <View key={p.id} style={styles.key}>
              <View style={[styles.swatch, { backgroundColor: p.color }]} />
              <Label color={colors.text}>{p.label}</Label>
              <Label>{thrown ? Math.round((punches[p.id].thrown / thrown) * 100) : 0}%</Label>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xl, paddingTop: space.xl },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: 6 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 1 },
});
