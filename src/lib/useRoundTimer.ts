import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Vibration } from 'react-native';
import { playSound, unlockSounds } from './sounds';

export type TimerPhase = 'idle' | 'prep' | 'work' | 'rest' | 'done';

export interface TimerConfig {
  rounds: number;
  workSec: number;
  restSec: number;
}

const PREP_MS = 10_000;
const WARNING_MS = 10_000;

const buzz = (pattern: number | number[]) => {
  if (Platform.OS !== 'web') Vibration.vibrate(pattern);
};

/** Boxing round clock driven by wall-clock deadlines so it never drifts. */
export function useRoundTimer(cfg: TimerConfig) {
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [round, setRound] = useState(1);
  const [completed, setCompleted] = useState(0);
  const [endsAt, setEndsAt] = useState(0);
  const [phaseMs, setPhaseMs] = useState(1);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const warned = useRef(false);
  /** Last whole second announced by the 3-2-1 countdown beeps. */
  const counted = useRef(-1);

  const active = phase === 'prep' || phase === 'work' || phase === 'rest';
  const running = active && pausedLeft === null;
  const left = pausedLeft ?? Math.max(0, endsAt - now);

  const begin = useCallback((next: TimerPhase, ms: number) => {
    const t = Date.now();
    setPhase(next);
    setPhaseMs(ms);
    setEndsAt(t + ms);
    setNow(t);
    warned.current = false;
    counted.current = -1;
    buzz(next === 'work' ? [0, 400] : [0, 150, 100, 150]);
    if (next === 'work') playSound('bell');
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (phase === 'work' && !warned.current && left <= WARNING_MS && left > 0) {
      warned.current = true;
      buzz(100);
      playSound('clapper');
    }
    // 3-2-1 beeps before the bell.
    const secs = Math.ceil(left / 1000);
    if ((phase === 'prep' || phase === 'rest') && secs <= 3 && secs >= 1 && secs !== counted.current) {
      counted.current = secs;
      playSound('beep');
    }
    if (left > 0) return;
    if (phase === 'prep') begin('work', cfg.workSec * 1000);
    else if (phase === 'rest') {
      setRound((r) => r + 1);
      begin('work', cfg.workSec * 1000);
    } else if (phase === 'work') {
      setCompleted(round);
      if (round >= cfg.rounds) {
        setPhase('done');
        buzz([0, 500, 200, 500, 200, 500]);
        playSound('bellEnd');
      } else if (cfg.restSec > 0) {
        playSound('bellEnd');
        begin('rest', cfg.restSec * 1000);
      } else {
        setRound((r) => r + 1);
        begin('work', cfg.workSec * 1000);
      }
    }
  }, [running, left, phase, round, cfg, begin]);

  return {
    phase,
    round,
    completed,
    left,
    pct: active ? 1 - left / phaseMs : phase === 'done' ? 1 : 0,
    warning: phase === 'work' && left <= WARNING_MS,
    paused: pausedLeft !== null,
    start: () => {
      unlockSounds();
      playSound('go');
      setRound(1);
      setCompleted(0);
      setPausedLeft(null);
      begin('prep', PREP_MS);
    },
    pause: () => setPausedLeft(Math.max(0, endsAt - Date.now())),
    resume: () => {
      if (pausedLeft === null) return;
      unlockSounds();
      setEndsAt(Date.now() + pausedLeft);
      setNow(Date.now());
      setPausedLeft(null);
    },
    skip: () => {
      setPausedLeft(null);
      setEndsAt(Date.now());
      setNow(Date.now());
    },
    stop: () => {
      setPausedLeft(null);
      setPhase(completed > 0 ? 'done' : 'idle');
    },
    reset: () => {
      setPausedLeft(null);
      setCompleted(0);
      setPhase('idle');
    },
  };
}
