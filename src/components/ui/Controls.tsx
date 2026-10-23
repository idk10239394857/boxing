import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, gradients, radius, space } from '../../theme';
import { PressableScale } from './Motion';
import { Display, Kicker } from './Text';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** The lit gradient for an activity colour (flat for anything else). */
export function gradientFor(color: string): readonly [string, string] {
  const match = (Object.keys(gradients) as (keyof typeof gradients)[]).find((k) => (colors as Record<string, string>)[k] === color);
  return match ? gradients[match] : [color, color];
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** primary: lit gradient fill; secondary: raised glass; ghost: outline. */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Activity colour for a primary button (default: the accent). */
  color?: string;
  icon?: IconName;
  size?: 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', color = colors.accent, icon, size = 'md', disabled, style }: ButtonProps) {
  const filled = variant === 'primary' && !disabled;
  const fg = filled ? (color === colors.white ? colors.ink : colors.white) : disabled ? colors.textMute : colors.text;
  const lg = size === 'lg';
  return (
    <PressableScale
      to={0.96}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={style}
      innerStyle={[styles.button, { minHeight: lg ? 60 : 50 }, !filled && styles.outline]}
    >
      {/* The fill is skewed so the button's trailing edge is cut at an angle, like a fight bill. */}
      {filled ? <View style={[styles.slant, { backgroundColor: color }]} /> : null}
      {icon ? <MaterialCommunityIcons name={icon} size={lg ? 22 : 18} color={fg} /> : null}
      <Display poster size={lg ? 24 : 19} color={fg}>
        {label}
      </Display>
    </PressableScale>
  );
}

export function IconButton({ icon, onPress, color = colors.text, size = 22, label }: { icon: IconName; onPress: () => void; color?: string; size?: number; label: string }) {
  return (
    <PressableScale to={0.9} accessibilityLabel={label} accessibilityRole="button" onPress={onPress} hitSlop={10} innerStyle={styles.iconButton}>
      <MaterialCommunityIcons name={icon} size={size} color={color} />
    </PressableScale>
  );
}

export function Chip({ label, active, onPress, icon, color = colors.accent }: { label: string; active: boolean; onPress: () => void; icon?: IconName; color?: string }) {
  return (
    <PressableScale
      to={0.96}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      innerStyle={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={16} color={active ? colors.white : colors.textDim} /> : null}
      <Kicker size={14} color={active ? colors.white : colors.textDim}>
        {label}
      </Kicker>
    </PressableScale>
  );
}

interface StepperProps {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (n: number) => ReactNode;
  compact?: boolean;
  color?: string;
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, format, compact, color = colors.accent }: StepperProps) {
  const set = (n: number) => onChange(Math.max(min, Math.min(max, n)));
  const btn = compact ? 40 : 48;
  return (
    <View style={styles.stepper}>
      <PressableScale
        to={0.9}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        onPress={() => set(value - step)}
        disabled={value <= min}
        innerStyle={[styles.stepBtn, { width: btn, height: btn }, value <= min && { opacity: 0.35 }]}
      >
        <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
      </PressableScale>
      <View style={{ minWidth: compact ? 44 : 60, alignItems: 'center' }}>
        {format ? format(value) : <Display size={compact ? 28 : 34}>{value}</Display>}
      </View>
      <PressableScale
        to={0.9}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        onPress={() => set(value + step)}
        innerStyle={[styles.stepBtn, { width: btn, height: btn, backgroundColor: color, borderColor: color }]}
      >
        <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    overflow: 'hidden',
  },
  slant: { position: 'absolute', top: 0, bottom: 0, left: -20, right: 10, transform: [{ skewX: '-12deg' }] },
  outline: { borderWidth: 1.5, borderColor: colors.borderHi },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.borderHi },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 40,
    borderWidth: 1.5,
    borderColor: colors.borderHi,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepBtn: { borderWidth: 1.5, borderColor: colors.borderHi, alignItems: 'center', justifyContent: 'center' },
});
