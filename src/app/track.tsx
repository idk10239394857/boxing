import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { closeModal, ModalHeader } from '../components/ModalHeader';
import { Body, Button, Card, Chip, Display, Label, ProgressBar, Screen, SectionHeader } from '../components/ui';
import { BoxerViewer } from '../features/boxer/BoxerViewer';
import { JAB_CROSS_HOOK } from '../features/boxer/clips';
import type { Stance, TrackEvent } from '../features/tracking/detector';
import { CountEditor, EventFeed, QualityPill, StrikeFlash, SummaryCard, TallyRow } from '../features/tracking/Panels';
import { pickVideo } from '../features/tracking/pickVideo';
import { addEvent, drilledTechniques, emptyTally, totalPunches } from '../features/tracking/session';
import { TrackerView, TRACKING_SUPPORTED } from '../features/tracking/TrackerView';
import type { BodyQuality, TrackerSource, TrackerStatus } from '../features/tracking/types';
import { TECHNIQUES } from '../data/techniques';
import { formatClock, todayKey } from '../lib/dates';
import { sessionXp, XP } from '../lib/gamification';
import { useFightStore } from '../store/useFightStore';
import type { PunchType } from '../types';
import { colors, radius, space } from '../theme';

type Phase = 'setup' | 'live' | 'summary';
type Mode = 'solo' | 'sparring';
type Tally = ReturnType<typeof emptyTally>;
type TallyAction = { type: 'reset'; fighters: number } | { type: 'event'; fighter: number; e: TrackEvent };

const CORNERS = [
  { name: 'Red corner', color: colors.red },
  { name: 'Blue corner', color: colors.blue },
];

const SPARRING_TIPS: [keyof typeof MaterialCommunityIcons.glyphMap, string][] = [
  ['camera-outline', 'Camera side-on to both of you, 3–4 m back, so neither fighter blocks the other.'],
  ['human-handsup', 'Both fighters fully in frame, head to feet. Red corner = whoever starts on the left of the screen.'],
  ['white-balance-sunny', 'Good light on both of you, nothing bright behind you.'],
  ['lock-outline', 'Runs entirely on your device. Video is never uploaded.'],
];

const tips = (stance: Stance): [keyof typeof MaterialCommunityIcons.glyphMap, string][] => [
  [
    'camera-outline',
    `Facing the camera works. For the most accurate jab and cross counts, angle it 30–45° to your ${stance === 'orthodox' ? 'right' : 'left'} (your rear-hand side).`,
  ],
  ['human-handsup', 'Step back 2–3 m so your whole body is in frame. At the very least, head to hips.'],
  ['white-balance-sunny', 'Light in front of you, not behind. Plain background helps.'],
  ['lock-outline', 'Runs entirely on your device. Video is never uploaded.'],
];
/** Camera orbit angle that matches the recommended placement (see tips). */
const cameraView = (stance: Stance) => (stance === 'orthodox' ? -0.6 : 0.6);

export default function ShadowCamScreen() {
  useKeepAwake();
  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<Mode>('solo');
  const [stance, setStance] = useState<Stance>('orthodox');
  const [blueStance, setBlueStance] = useState<Stance>('orthodox');
  const [me, setMe] = useState(0);
  const stances = useMemo<Stance[]>(() => (mode === 'solo' ? [stance] : [stance, blueStance]), [mode, stance, blueStance]);
  const [source, setSource] = useState<TrackerSource | null>(null);
  const [status, setStatus] = useState<TrackerStatus>({ phase: 'loading', message: 'Starting…' });
  const [quality, setQuality] = useState<BodyQuality>('none');
  const [facing, setFacing] = useState(false);
  const [fps, setFps] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tallies, dispatch] = useReducer(
    (s: Tally[], a: TallyAction) =>
      a.type === 'reset'
        ? Array.from({ length: a.fighters }, emptyTally)
        : s.map((t, i) => (i === a.fighter ? addEvent(t, a.e) : t)),
    [emptyTally()],
  );
  /** The tally that gets saved: yours. */
  const tally = tallies[Math.min(me, tallies.length - 1)] ?? emptyTally();
  const [last, setLast] = useState<{ e: TrackEvent; fighter: number } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [bag, setBag] = useState(false);
  const [counts, setCounts] = useState<Record<PunchType, number>>(() => emptyTally().punches);
  const logTrackedSession = useFightStore((s) => s.logTrackedSession);

  const [progress, setProgress] = useState(0);
  const running = phase === 'live' && status.phase === 'running' && !paused;
  const isFile = source?.kind === 'file';
  // Camera sessions count wall-clock time; videos report their own position.
  useEffect(() => {
    if (!running || isFile) return;
    const id = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running, isFile]);
  const onProgress = useCallback((t: number, d: number) => {
    setSeconds(Math.round(t));
    setProgress(d ? t / d : 0);
  }, []);

  const start = (src: TrackerSource) => {
    dispatch({ type: 'reset', fighters: stances.length });
    setMe(0);
    setLast(null);
    setSeconds(0);
    setProgress(0);
    setPaused(false);
    setStatus({ phase: 'loading', message: 'Starting…' });
    setSource(src);
    setPhase('live');
  };
  const startVideo = async () => {
    const file = await pickVideo();
    if (file) start({ kind: 'file', ...file });
  };

  const onEvent = useCallback((e: TrackEvent, fighter: number) => {
    dispatch({ type: 'event', fighter, e });
    setLast({ e, fighter });
  }, []);
  const onStatus = useCallback((s: TrackerStatus) => {
    setStatus(s);
    if (s.phase === 'ended') setPhase('summary');
  }, []);

  const finish = () => setPhase('summary');
  // Start the editable counts from what was detected whenever a summary opens (or you switch corner).
  useEffect(() => {
    if (phase === 'summary') setCounts({ ...tally.punches });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, me]);
  const sparring = tallies.length > 1;

  const drilled = useMemo(() => drilledTechniques(tally), [tally]);
  const minutes = Math.max(1, Math.round(seconds / 60));
  const rounds = Math.max(1, Math.round(seconds / 180));
  const xp = sessionXp(rounds) + drilled.length * XP.techniqueDrilled;
  const total = tallies.reduce((n, t) => n + totalPunches(t), 0);
  const finalTotal = Object.values(counts).reduce((a, b) => a + b, 0);

  const save = () => {
    const punches = Object.fromEntries(
      (Object.entries(counts) as [PunchType, number][]).filter(([, n]) => n > 0).map(([k, n]) => [k, { thrown: n, landed: bag ? n : 0 }]),
    );
    const opponent = sparring ? tallies[1 - me] : null;
    logTrackedSession({
      date: todayKey(),
      type: sparring ? 'sparring' : bag ? 'bag' : 'shadowboxing',
      rounds,
      durationMin: minutes,
      notes:
        `Shadow Cam: ${finalTotal} punches, ${tally.defense} defensive moves, best combo ${tally.bestCombo}.` +
        (opponent ? ` Opponent: ${totalPunches(opponent)} punches, ${opponent.defense} defensive moves.` : ''),
      punches,
      drilled,
    });
    closeModal();
  };

  return (
    <Screen>
      <ModalHeader title="Shadow Cam" subtitle="Counts punches, slips and rolls from your camera" />

      {phase === 'setup' ? (
        <>
          <View>
            <BoxerViewer clip={JAB_CROSS_HOOK} speed={0.8} paused={false} view={cameraView(stance)} southpaw={stance === 'southpaw'} height={240} />
            <View style={styles.heroText} pointerEvents="none">
              <Display size={26}>Throw. We count.</Display>
              <Label color={colors.text}>The view your camera should have</Label>
            </View>
          </View>
          <Body color={colors.textDim}>
            Shadowbox or hit the bag in front of your camera. Shadow Cam reads your joints in real time and logs every
            punch, combo and head movement for you.
          </Body>
          <View style={styles.row}>
            <Chip label="Solo" icon="account" active={mode === 'solo'} onPress={() => setMode('solo')} />
            <Chip label="Sparring · 2 fighters" icon="account-multiple" active={mode === 'sparring'} onPress={() => setMode('sparring')} />
          </View>
          <Card style={{ gap: space.md }}>
            {(mode === 'solo' ? tips(stance) : SPARRING_TIPS).map(([icon, text]) => (
              <View key={text} style={styles.tip}>
                <MaterialCommunityIcons name={icon} size={20} color={colors.accent} />
                <Body size={14} style={{ flex: 1 }}>
                  {text}
                </Body>
              </View>
            ))}
          </Card>
          <View style={{ gap: space.sm }}>
            <Label color={mode === 'sparring' ? colors.red : colors.textDim}>{mode === 'solo' ? 'Your stance' : 'Red corner stance'}</Label>
            <View style={styles.row}>
              <Chip label="Orthodox (left lead)" active={stance === 'orthodox'} color={mode === 'sparring' ? colors.red : colors.accent} onPress={() => setStance('orthodox')} />
              <Chip label="Southpaw (right lead)" active={stance === 'southpaw'} color={mode === 'sparring' ? colors.red : colors.accent} onPress={() => setStance('southpaw')} />
            </View>
            {mode === 'sparring' ? (
              <>
                <Label color={colors.blue}>Blue corner stance</Label>
                <View style={styles.row}>
                  <Chip label="Orthodox" active={blueStance === 'orthodox'} color={colors.blue} onPress={() => setBlueStance('orthodox')} />
                  <Chip label="Southpaw" active={blueStance === 'southpaw'} color={colors.blue} onPress={() => setBlueStance('southpaw')} />
                </View>
              </>
            ) : null}
          </View>
          {TRACKING_SUPPORTED ? (
            <>
              <Button label="Start camera" icon="camera" size="lg" onPress={() => start({ kind: 'camera' })} />
              <Button label="Analyze a video" icon="filmstrip" variant="ghost" onPress={startVideo} />
            </>
          ) : (
            <TrackerView source={{ kind: 'camera' }} stances={stances} paused onEvent={onEvent} onStatus={onStatus} onQuality={setQuality} />
          )}
        </>
      ) : null}

      {phase === 'live' && source ? (
        <>
          <View>
            <TrackerView
              source={source}
              stances={stances}
              paused={paused}
              onEvent={onEvent}
              onStatus={onStatus}
              onQuality={setQuality}
              onView={setFacing}
              onFps={setFps}
              onProgress={onProgress}
            />
            <View style={styles.hudTop} pointerEvents="none">
              <View style={styles.rec}>
                <View style={[styles.dot, { backgroundColor: running ? colors.danger : colors.textMute }]} />
                <Display size={16}>{formatClock(seconds)}</Display>
                {isFile ? <Label size={9}>Analyzing{progress ? ` ${Math.round(progress * 100)}%` : '…'}</Label> : fps ? <Label size={9}>{fps} fps</Label> : null}
              </View>
              {status.phase === 'running' ? <QualityPill quality={quality} /> : null}
            </View>
            <StrikeFlash
              event={last?.e ?? null}
              combo={last ? tallies[last.fighter]?.combo ?? 0 : 0}
              corner={sparring && last ? CORNERS[last.fighter] : undefined}
            />
            {status.phase === 'loading' || status.phase === 'error' ? (
              <View style={styles.overlay}>
                {status.phase === 'loading' ? (
                  <Label color={colors.text}>{status.message}</Label>
                ) : (
                  <View style={{ gap: space.md, alignItems: 'center', maxWidth: 420 }}>
                    <MaterialCommunityIcons name="camera-off" size={36} color={colors.danger} />
                    <Body align="center">{status.message}</Body>
                    {source.kind === 'camera' ? <Button label="Analyze a video instead" icon="filmstrip" onPress={startVideo} /> : null}
                    <Button label="Back" variant="ghost" onPress={() => setPhase('setup')} />
                  </View>
                )}
              </View>
            ) : null}
          </View>

          {isFile ? <ProgressBar pct={progress} color={colors.accent} height={4} /> : null}
          {facing && !sparring && running ? (
            <View style={[styles.tip, styles.coach]}>
              <MaterialCommunityIcons name="camera-switch-outline" size={20} color={colors.warning} />
              <Body size={13} style={{ flex: 1 }}>
                Facing the camera works. For the most accurate jab and cross counts, angle it 30–45° to your{' '}
                {stance === 'orthodox' ? 'right' : 'left'}.
              </Body>
            </View>
          ) : null}
          {tallies.map((t, i) => (
            <TallyRow key={i} tally={t} corner={sparring ? CORNERS[i] : undefined} />
          ))}
          <View style={styles.row}>
            <Button
              label={paused ? 'Resume' : 'Pause'}
              icon={paused ? 'play' : 'pause'}
              variant="ghost"
              onPress={() => setPaused((p) => !p)}
              style={{ flex: 1 }}
            />
            <Button label="Finish" icon="flag-checkered" onPress={finish} style={{ flex: 1.4 }} />
          </View>
          <SectionHeader title="Live feed" right={<Label color={colors.text}>{total} punches</Label>} />
          <EventFeed events={sparring ? tallies[0].events.concat(tallies[1].events).sort((a, b) => a.t - b.t) : tally.events} />
        </>
      ) : null}

      {phase === 'summary' ? (
        <>
          {sparring ? (
            <>
              <View style={styles.row}>
                {tallies.map((t, i) => (
                  <Card key={i} accent={CORNERS[i].color} style={styles.cornerCard}>
                    <Label color={CORNERS[i].color}>{CORNERS[i].name}</Label>
                    <Display size={44}>{totalPunches(t)}</Display>
                    <Label>punches · {t.defense} defense · best combo {t.bestCombo}</Label>
                  </Card>
                ))}
              </View>
              <View style={{ gap: space.sm }}>
                <Label>Which one is you?</Label>
                <View style={styles.row}>
                  {CORNERS.map((c, i) => (
                    <Chip key={c.name} label={c.name} active={me === i} color={c.color} onPress={() => setMe(i)} />
                  ))}
                </View>
              </View>
            </>
          ) : null}
          <SummaryCard tally={tally} seconds={seconds} counts={counts} />
          <CountEditor counts={counts} onChange={setCounts} />
          {sparring ? null : (
          <Pressable onPress={() => setBag((b) => !b)} style={styles.toggle} accessibilityRole="switch" accessibilityState={{ checked: bag }}>
            <View style={[styles.box, bag && styles.boxOn]}>
              {bag ? <MaterialCommunityIcons name="check-bold" size={14} color={colors.ink} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Display size={16}>I was hitting a bag</Display>
              <Label>Count every punch as landed. Leave off for shadowboxing.</Label>
            </View>
          </Pressable>
          )}
          {drilled.length ? (
            <Card style={{ gap: space.sm }}>
              <Label color={colors.text}>Drill credit · +{XP.techniqueDrilled} XP each</Label>
              <View style={styles.row}>
                {drilled.map((id) => (
                  <View key={id} style={styles.credit}>
                    <Label color={colors.text}>{TECHNIQUES.find((t) => t.id === id)?.name ?? id}</Label>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
          <View style={styles.xp}>
            <View style={{ flex: 1, gap: 2 }}>
              <Label color={colors.text}>Bank it</Label>
              <Label>
                {formatClock(seconds)} · {rounds} round{rounds > 1 ? 's' : ''} logged as {sparring ? 'sparring' : bag ? 'bag work' : 'shadowboxing'}
              </Label>
            </View>
            <Display size={32} color={colors.xp}>
              +{xp} XP
            </Display>
          </View>
          <Button label="Save session" icon="check" size="lg" onPress={save} disabled={finalTotal === 0 && tally.defense === 0} />
          <Button label="Go again" icon="restart" variant="ghost" onPress={() => setPhase('setup')} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroText: { position: 'absolute', left: 16, bottom: 14, gap: 2 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  coach: { paddingLeft: space.md, paddingVertical: space.xs, borderLeftWidth: 3, borderLeftColor: colors.warning },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hudTop: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rec: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(7, 16, 31, 0.78)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7, 12, 24, 0.9)', alignItems: 'center', justifyContent: 'center', padding: space.xl, borderRadius: 10 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderHi },
  box: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.borderHi, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  credit: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.surfaceHi },
  xp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cornerCard: { flex: 1, minWidth: 150, gap: 2 },
});
