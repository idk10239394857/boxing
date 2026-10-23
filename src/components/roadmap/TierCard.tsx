import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { XP } from '../../lib/gamification';
import type { TierView } from '../../store/selectors';
import { useFightStore } from '../../store/useFightStore';
import { colors, radius, space } from '../../theme';
import { Body, Card, Display, Label, Segments } from '../ui';

export function TierCard({ tier, current }: { tier: TierView; current: boolean }) {
  const toggleSkill = useFightStore((s) => s.toggleSkill);
  const [open, setOpen] = useState(current);
  const total = tier.skills.length;
  const status = tier.completed ? 'Cleared' : tier.unlocked ? 'In progress' : 'Locked';

  return (
    <Card style={[styles.card, !tier.unlocked && { opacity: 0.6 }]}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.head} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.titleRow}>
            <Display size={22} style={{ flex: 1 }}>
              {tier.name}
            </Display>
            {tier.unlocked ? (
              <Display size={17} color={tier.completed ? colors.accent : colors.text}>
                {tier.done}
                <Display size={14} color={colors.textDim}>
                  /{total}
                </Display>
              </Display>
            ) : (
              <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMute} />
            )}
          </View>
          <Label color={current ? colors.text : colors.textMute}>
            Tier {tier.index + 1} · {status}
          </Label>
          <Segments count={total} filled={tier.done} height={6} />
          <Body size={13} color={colors.textDim}>
            {tier.tagline}
          </Body>
        </View>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textMute} />
      </Pressable>

      {open ? (
        <View style={styles.list}>
          {tier.skills.map((skill) => (
            <Pressable
              key={skill.id}
              disabled={!tier.unlocked}
              onPress={() => toggleSkill(skill.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: skill.done, disabled: !tier.unlocked }}
              style={({ pressed }) => [styles.skill, pressed && { backgroundColor: colors.surfaceHi }]}
            >
              <View style={[styles.box, skill.done && styles.boxOn]}>
                {skill.done ? <MaterialCommunityIcons name="check-bold" size={14} color={colors.ink} /> : null}
              </View>
              <Body
                size={14}
                style={{ flex: 1 }}
                color={skill.done ? colors.textDim : colors.text}
              >
                {skill.label}
              </Body>
            </Pressable>
          ))}
          {!tier.completed ? (
            <Label color={colors.textDim} style={{ marginTop: space.sm, paddingHorizontal: 4 }}>
              {tier.unlocked ? `Clear all to unlock the next tier · +${XP.tierCompleted} XP` : 'Clear the previous tier to unlock'}
            </Label>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.sm },
  skill: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44, paddingHorizontal: 4, borderRadius: radius.sm },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
