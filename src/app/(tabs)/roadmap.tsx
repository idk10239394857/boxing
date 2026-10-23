import { StyleSheet, View } from 'react-native';
import { TierCard } from '../../components/roadmap/TierCard';
import { Card, Display, Label, Screen } from '../../components/ui';
import { useRoadmap } from '../../store/selectors';
import { colors, space, tabColor } from '../../theme';

export default function RoadmapScreen() {
  const tiers = useRoadmap();
  const done = tiers.reduce((n, t) => n + t.done, 0);
  const total = tiers.reduce((n, t) => n + t.skills.length, 0);
  const current = tiers.find((t) => t.unlocked && !t.completed);

  return (
    <Screen kicker="The path" title="Roadmap" subtitle="Five tiers from first bell to fight ready" color={tabColor.roadmap}>
      <Card style={{ gap: space.lg, paddingTop: space.xl }}>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Display size={30}>{current?.name ?? 'Fight Ready'}</Display>
            <Label>{current ? `Tier ${current.index + 1} of ${tiers.length}` : 'Every tier cleared'}</Label>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Display size={30} color={colors.accent}>
              {done}
              <Display size={18} color={colors.textDim}>
                /{total}
              </Display>
            </Display>
            <Label>Skills</Label>
          </View>
        </View>
        <View style={styles.ladder}>
          {tiers.map((t) => (
            <View key={t.id} style={{ flex: t.skills.length, gap: 6 }}>
              <View style={styles.rung}>
                <View style={{ width: `${(t.done / t.skills.length) * 100}%`, height: '100%', backgroundColor: colors.accent, borderRadius: 1 }} />
              </View>
              <Label size={11} color={t.id === current?.id ? colors.text : colors.textMute} numberOfLines={1}>
                {t.index + 1}
              </Label>
            </View>
          ))}
        </View>
      </Card>

      {tiers.map((t) => (
        <TierCard key={t.id} tier={t} current={t.id === current?.id} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  ladder: { flexDirection: 'row', gap: 3 },
  rung: { height: 10, borderRadius: 2, backgroundColor: colors.sunken, overflow: 'hidden' },
});
