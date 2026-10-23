import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { closeModal, ModalHeader } from '../components/ModalHeader';
import { Button, Chip, Display, IconButton, Label, Screen, Stepper } from '../components/ui';
import { SESSION_TYPES } from '../data/sessionTypes';
import { addDays, formatLong, todayKey } from '../lib/dates';
import { sessionXp, XP } from '../lib/gamification';
import { useFightStore } from '../store/useFightStore';
import type { SessionType } from '../types';
import { colors, fonts, radius, space } from '../theme';

type Params = { date?: string; rounds?: string; duration?: string; type?: SessionType };

export default function LogSessionScreen() {
  const params = useLocalSearchParams<Params>();
  const logSession = useFightStore((s) => s.logSession);
  const today = todayKey();

  const [date, setDate] = useState(params.date && params.date <= today ? params.date : today);
  const [type, setType] = useState<SessionType>(params.type ?? 'bag');
  const [rounds, setRounds] = useState(Number(params.rounds) || 6);
  const [duration, setDuration] = useState(Number(params.duration) || 45);
  const [notes, setNotes] = useState('');

  const submit = () => {
    logSession({ date, type, rounds, durationMin: duration, notes });
    closeModal();
  };

  return (
    <Screen>
      <ModalHeader title="Log training" subtitle="What did you work on?" />

      <Field label="Date">
        <View style={styles.dateRow}>
          <IconButton icon="chevron-left" label="Previous day" onPress={() => setDate(addDays(date, -1))} />
          <Display size={22} style={{ flex: 1 }} align="center">
            {date === today ? 'Today' : formatLong(date)}
          </Display>
          <IconButton
            icon="chevron-right"
            label="Next day"
            color={date < today ? colors.text : colors.textMute}
            onPress={() => date < today && setDate(addDays(date, 1))}
          />
        </View>
      </Field>

      <Field label="Type">
        <View style={styles.chips}>
          {SESSION_TYPES.map((t) => (
            <Chip key={t.id} label={t.label} icon={t.icon} active={type === t.id} onPress={() => setType(t.id)} />
          ))}
        </View>
      </Field>

      <View>
        <View style={styles.stepRow}>
          <Display size={17} style={{ flex: 1 }}>
            Rounds
          </Display>
          <Stepper value={rounds} onChange={setRounds} max={50} />
        </View>
        <View style={styles.stepRow}>
          <Display size={17} style={{ flex: 1 }}>
            Minutes
          </Display>
          <Stepper value={duration} onChange={setDuration} step={5} min={5} max={300} />
        </View>
      </View>

      <Field label="Notes">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="What worked? What got you hit?"
          placeholderTextColor={colors.textMute}
          multiline
          style={styles.notes}
        />
      </Field>

      <View style={styles.xp}>
        <View style={{ flex: 1, gap: 2 }}>
          <Label>You earn</Label>
          <Label color={colors.textMute}>
            {XP.session} for the session + {rounds} × {XP.round} per round
          </Label>
        </View>
        <Display size={32} color={colors.xp}>
          +{sessionXp(rounds)} XP
        </Display>
      </View>

      <Button label="Log session" icon="check" size="lg" onPress={submit} />
    </Screen>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[{ gap: space.sm }, style]}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.borderHi,
    paddingVertical: space.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  notes: {
    minHeight: 90,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: colors.borderHi,
    padding: space.md,
    textAlignVertical: 'top',
  },
  xp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
