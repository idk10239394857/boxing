import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ModalHeader } from '../../components/ModalHeader';
import { TechniqueDemo } from '../../features/boxer/TechniqueDemo';
import { Body, Button, Card, Screen, SectionHeader, StatBlock } from '../../components/ui';
import { XP } from '../../lib/gamification';
import { useTechnique } from '../../store/selectors';
import { useFightStore } from '../../store/useFightStore';
import { colors, space } from '../../theme';

export default function TechniqueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const technique = useTechnique(id);
  const drill = useFightStore((s) => s.drillTechnique);

  if (!technique) {
    return (
      <Screen>
        <ModalHeader title="Not found" />
      </Screen>
    );
  }

  const last = technique.lastDrilled ? new Date(technique.lastDrilled).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';

  return (
    <Screen>
      <ModalHeader title={technique.name} subtitle={technique.category} />
      <TechniqueDemo techniqueId={technique.id} />
      <Body size={17} color={colors.text}>
        {technique.description}
      </Body>

      <SectionHeader title="Coaching cues" />
      <View>
        {technique.cues.map((cue) => (
          <View key={cue} style={styles.cue}>
            <View style={styles.dot} />
            <Body style={{ flex: 1 }}>{cue}</Body>
          </View>
        ))}
      </View>

      <Card style={styles.stats}>
        <StatBlock label="Times drilled" value={technique.timesDrilled} />
        <View style={styles.divider} />
        <StatBlock label="Last drilled" value={last} size={24} />
      </Card>

      <Button label={`Mark as drilled · +${XP.techniqueDrilled} XP`} icon="check" size="lg" onPress={() => drill(technique.id)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 1, backgroundColor: colors.textDim, marginTop: 8 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
});
