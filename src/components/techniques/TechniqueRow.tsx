import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Technique } from '../../types';
import { colors, radius, space } from '../../theme';
import { Display, Label } from '../ui';

export function TechniqueRow({ technique }: { technique: Technique }) {
  const drilled = technique.timesDrilled > 0;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/technique/[id]', params: { id: technique.id } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceHi }]}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Display size={17}>{technique.name}</Display>
        <Label numberOfLines={1}>{technique.cues[0]}</Label>
      </View>
      <View style={[styles.count, drilled && { backgroundColor: colors.accent }]}>
        <Label size={13} color={drilled ? colors.ink : colors.textMute}>
          {technique.timesDrilled}×
        </Label>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMute} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  count: {
    minWidth: 40,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderHi,
  },
});
