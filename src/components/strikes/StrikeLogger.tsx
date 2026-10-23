import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PUNCH_TYPES } from '../../data/sessionTypes';
import { useFightStore } from '../../store/useFightStore';
import type { PunchType } from '../../types';
import { colors, space } from '../../theme';
import { Button, Card, Display, Label, Stepper } from '../ui';

type Counts = Record<PunchType, { thrown: number; landed: number }>;

const empty = (): Counts =>
  Object.fromEntries(PUNCH_TYPES.map((p) => [p.id, { thrown: 0, landed: 0 }])) as Counts;

/** Quick tally after bag work / sparring. Landed can never exceed thrown. */
export function StrikeLogger() {
  const logPunches = useFightStore((s) => s.logPunches);
  const [counts, setCounts] = useState<Counts>(empty);
  const total = PUNCH_TYPES.reduce((n, p) => n + counts[p.id].thrown, 0);

  const update = (type: PunchType, field: 'thrown' | 'landed', value: number) =>
    setCounts((c) => {
      const next = { ...c[type], [field]: value };
      if (field === 'thrown') next.landed = Math.min(next.landed, value);
      else next.thrown = Math.max(next.thrown, value);
      return { ...c, [type]: next };
    });

  const save = () => {
    logPunches(counts);
    setCounts(empty());
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.headRow}>
        <Label style={{ flex: 1 }}>Punch</Label>
        <Label style={styles.colHead}>Thrown</Label>
        <Label style={styles.colHead}>Landed</Label>
      </View>
      {PUNCH_TYPES.map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={styles.name}>
            <View style={[styles.swatch, { backgroundColor: p.color }]} />
            <Display size={16}>{p.label}</Display>
          </View>
          <View style={styles.steppers}>
            <Stepper compact value={counts[p.id].thrown} onChange={(n) => update(p.id, 'thrown', n)} />
            <Stepper compact value={counts[p.id].landed} onChange={(n) => update(p.id, 'landed', n)} />
          </View>
        </View>
      ))}
      <Button label={total ? `Log ${total} punches` : 'Log punches'} icon="check" disabled={!total} onPress={save} />
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center' },
  colHead: { width: 132, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  name: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1, minWidth: 80 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  steppers: { flexDirection: 'row', gap: space.sm },
});
