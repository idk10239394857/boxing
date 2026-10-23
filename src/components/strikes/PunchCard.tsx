import { StyleSheet, View } from 'react-native';
import { landPct } from '../../store/selectors';
import type { PunchStat } from '../../types';
import { colors, space } from '../../theme';
import { Display, Label, ProgressBar } from '../ui';

/** One row of the per-punch table: thrown, landed, and accuracy as a bar in the punch's colour. */
export function PunchRow({ stat, label, color }: { stat: PunchStat; label: string; color: string }) {
  const pct = landPct(stat);
  return (
    <View style={styles.row}>
      <View style={styles.name}>
        <View style={[styles.swatch, { backgroundColor: color }]} />
        <Display size={16}>{label}</Display>
      </View>
      <Display size={16} style={styles.num}>
        {stat.thrown.toLocaleString()}
      </Display>
      <Display size={16} style={styles.num}>
        {stat.landed.toLocaleString()}
      </Display>
      <View style={styles.acc}>
        <Display size={16} color={color}>
          {pct}%
        </Display>
        <ProgressBar pct={pct / 100} color={color} height={4} />
      </View>
    </View>
  );
}

export function PunchTableHead() {
  return (
    <View style={[styles.row, { minHeight: 0, paddingBottom: space.sm }]}>
      <Label style={styles.name}>Punch</Label>
      <Label style={styles.num}>Thrown</Label>
      <Label style={styles.num}>Landed</Label>
      <Label style={[styles.acc, { textAlign: 'right' }]}>Accuracy</Label>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: { flex: 1.3, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  num: { flex: 1, textAlign: 'right' },
  acc: { flex: 1.2, gap: 6, alignItems: 'flex-end' },
});
