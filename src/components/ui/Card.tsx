import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, space } from '../../theme';
import { Display, Kicker } from './Text';

/**
 * A section, not a box: a rule across the top and room to breathe. `accent` turns the rule
 * into a short red bar.
 */
export function Card({ style, accent, children, ...rest }: ViewProps & { accent?: string }) {
  return (
    <View {...rest} style={[styles.card, style]}>
      <View style={styles.rule} />
      {accent ? <View style={[styles.bar, { backgroundColor: accent }]} /> : null}
      {children}
    </View>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Display poster size={34} style={{ flex: 1 }}>
        {title}
      </Display>
      {typeof right === 'string' ? <Kicker color={colors.textMute}>{right}</Kicker> : right}
    </View>
  );
}

interface StatProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: ReactNode;
  size?: number;
}

export function StatBlock({ label, value, color = colors.text, icon, size = 40 }: StatProps) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValue}>
        {icon}
        <Display size={size} color={color}>
          {value}
        </Display>
      </View>
      <Kicker size={12} color={colors.textMute}>
        {label}
      </Kicker>
    </View>
  );
}


const styles = StyleSheet.create({
  card: { paddingTop: space.xl, paddingBottom: space.sm },
  rule: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: colors.border },
  bar: { position: 'absolute', top: 0, left: 0, width: 48, height: 3 },
  section: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.lg },
  stat: { flex: 1, alignItems: 'flex-start', gap: 2 },
  statValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
