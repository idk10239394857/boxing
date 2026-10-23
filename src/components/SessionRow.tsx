import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { sessionTypeMeta } from '../data/sessionTypes';
import { formatLong } from '../lib/dates';
import { useFightStore } from '../store/useFightStore';
import type { Session } from '../types';
import { colors, radius, space } from '../theme';
import { Body, Display, Kicker, Label } from './ui';

export function SessionRow({ session, showDate, deletable }: { session: Session; showDate?: boolean; deletable?: boolean }) {
  const meta = sessionTypeMeta(session.type);
  const deleteSession = useFightStore((s) => s.deleteSession);
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.row}>
      <View style={[styles.tick, { backgroundColor: meta.color }]} />
      <View style={{ flex: 1, gap: 3 }}>
        <Display poster size={22}>
          {meta.label}
        </Display>
        <Label>
          {showDate ? `${formatLong(session.date)} · ` : ''}
          {session.rounds} rounds · {session.durationMin} min
        </Label>
        {session.notes ? (
          <Body size={13} color={colors.textDim} numberOfLines={2}>
            {session.notes}
          </Body>
        ) : null}
      </View>
      <Kicker size={13}>+{session.xpEarned} XP</Kicker>
      {deletable ? (
        <Pressable
          onPress={() => (confirming ? deleteSession(session.id) : setConfirming(true))}
          onBlur={() => setConfirming(false)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={confirming ? 'Confirm delete session' : 'Delete session'}
          style={[styles.del, confirming && styles.delConfirm]}
        >
          {confirming ? (
            <Label color={colors.ink}>Delete</Label>
          ) : (
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMute} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderHi,
  },
  tick: { width: 4, alignSelf: 'stretch', transform: [{ skewX: '-12deg' }] },
  del: { padding: 8, borderRadius: radius.sm },
  delConfirm: { backgroundColor: colors.danger, paddingHorizontal: 10 },
});
