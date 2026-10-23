import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ModalHeader } from '../components/ModalHeader';
import { Body, Button, Card, Display, Label, Screen, Segments, Stepper } from '../components/ui';
import { formatClock } from '../lib/dates';
import { useRoundTimer, type TimerConfig } from '../lib/useRoundTimer';
import { colors, radius, space } from '../theme';

const PRESETS: { label: string; name: string; detail: string; cfg: TimerConfig }[] = [
  { label: 'Amateur 3×3', name: 'Amateur', detail: '3 × 3:00', cfg: { rounds: 3, workSec: 180, restSec: 60 } },
  { label: 'Pro 12×3', name: 'Pro', detail: '12 × 3:00', cfg: { rounds: 12, workSec: 180, restSec: 60 } },
  { label: 'Bag 6×3', name: 'Bag', detail: '6 × 3:00', cfg: { rounds: 6, workSec: 180, restSec: 60 } },
  { label: 'HIIT 8×1', name: 'HIIT', detail: '8 × 1:00', cfg: { rounds: 8, workSec: 60, restSec: 30 } },
];

const PHASE_LABEL = { idle: 'Ready', prep: 'Get ready', work: 'Fight', rest: 'Rest', done: 'Final bell' } as const;

export default function TimerScreen() {
  useKeepAwake();
  const { width } = useWindowDimensions();
  const [cfg, setCfg] = useState<TimerConfig>(PRESETS[2].cfg);
  const timer = useRoundTimer(cfg);
  // Readable from across the room: the clock takes as much width as it can get.
  const clockSize = Math.min((width - 48) / 2.9, 168);

  const phaseColor =
    timer.phase === 'work' ? (timer.warning ? colors.warning : colors.accent) : timer.phase === 'rest' ? colors.silver : colors.text;
  const roundsDone = timer.phase === 'done' ? timer.completed : timer.phase === 'idle' ? 0 : Math.max(0, timer.round - 1) + (timer.phase === 'work' ? timer.pct : 0);

  const logRounds = () => {
    const minutes = Math.max(5, Math.round((timer.completed * cfg.workSec + (timer.completed - 1) * cfg.restSec) / 60));
    router.replace({
      pathname: '/log-session',
      params: { rounds: String(timer.completed), duration: String(minutes), type: 'bag' },
    });
  };

  return (
    <Screen>
      <ModalHeader title="Round timer" subtitle="Bell to bell, with a 10-second warning" />

      <View style={styles.center}>
        <View style={styles.phaseRow}>
          <Display size={20} color={phaseColor}>
            {PHASE_LABEL[timer.phase]}
          </Display>
          <Display size={20} color={colors.textDim}>
            {timer.phase === 'done' ? 'Rounds completed' : `Round ${Math.min(Math.max(timer.round, 1), cfg.rounds)} of ${cfg.rounds}`}
          </Display>
        </View>
        <Display brand size={clockSize * 0.86} color={timer.phase === 'work' ? phaseColor : colors.text} align="center">
          {timer.phase === 'idle' ? formatClock(cfg.workSec) : timer.phase === 'done' ? `${timer.completed}` : formatClock(timer.left / 1000)}
        </Display>
        {/* One band per round: done rounds fill, the current one fills as the clock runs. */}
        <View style={{ alignSelf: 'stretch' }}>
          <Segments
            count={cfg.rounds}
            filled={roundsDone}
            current={timer.phase === 'done' ? undefined : Math.min(Math.max(timer.round, 1), cfg.rounds) - 1}
            height={14}
            gap={4} color={timer.warning ? colors.warning : colors.accent} />
        </View>
        {timer.warning ? (
          <Display size={20} color={colors.warning}>
            Last 10 seconds. Empty the tank.
          </Display>
        ) : null}
      </View>

      {timer.phase === 'idle' ? (
        <>
          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.label}
                accessibilityRole="button"
                accessibilityState={{ selected: p.cfg === cfg }}
                onPress={() => setCfg(p.cfg)}
                style={({ pressed }) => [styles.preset, p.cfg === cfg && styles.presetOn, pressed && { opacity: 0.85 }]}
              >
                <Label size={13} color={p.cfg === cfg ? colors.ink : colors.text}>
                  {p.name}
                </Label>
                <Label size={12} color={p.cfg === cfg ? colors.ink : colors.textDim}>
                  {p.detail}
                </Label>
              </Pressable>
            ))}
          </View>
          <Card style={styles.config}>
            <ConfigRow label="Rounds">
              <Stepper compact value={cfg.rounds} min={1} max={15} onChange={(rounds) => setCfg({ ...cfg, rounds })} />
            </ConfigRow>
            <ConfigRow label="Round length">
              <Stepper
                compact
                value={cfg.workSec}
                step={30}
                min={30}
                max={300}
                onChange={(workSec) => setCfg({ ...cfg, workSec })}
                format={(n) => <Display size={20}>{formatClock(n)}</Display>}
              />
            </ConfigRow>
            <ConfigRow label="Rest">
              <Stepper
                compact
                value={cfg.restSec}
                step={15}
                min={0}
                max={120}
                onChange={(restSec) => setCfg({ ...cfg, restSec })}
                format={(n) => <Display size={20}>{formatClock(n)}</Display>}
              />
            </ConfigRow>
          </Card>
          <Button label="Start" icon="bell-ring-outline" size="lg" onPress={timer.start} />
        </>
      ) : timer.phase === 'done' ? (
        <>
          <Body align="center" color={colors.textDim}>
            {timer.completed > 0 ? 'Good work. Bank it while it’s fresh.' : 'No full rounds completed.'}
          </Body>
          {timer.completed > 0 ? (
            <Button label={`Log ${timer.completed} rounds`} icon="plus" size="lg" onPress={logRounds} />
          ) : null}
          <Button label="Reset" variant="ghost" icon="restart" onPress={timer.reset} />
        </>
      ) : (
        <View style={styles.controls}>
          <Button label="Stop" variant="ghost" icon="stop" onPress={timer.stop} style={{ flex: 1 }} />
          <Button
            label={timer.paused ? 'Resume' : 'Pause'}
            icon={timer.paused ? 'play' : 'pause'}
            onPress={timer.paused ? timer.resume : timer.pause}
            color={phaseColor}
            style={{ flex: 1.4 }}
          />
          <Button label="Skip" variant="ghost" icon="skip-next" onPress={timer.skip} style={{ flex: 1 }} />
        </View>
      )}
    </Screen>
  );
}

function ConfigRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.configRow}>
      <Display size={16} style={{ flex: 1 }}>
        {label}
      </Display>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space.lg, paddingVertical: space.xl },
  phaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  presets: { flexDirection: 'row', gap: space.sm },
  preset: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1.5, borderColor: colors.borderHi, gap: 2 },
  presetOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  config: { gap: space.md },
  configRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  controls: { flexDirection: 'row', gap: space.sm },
});
