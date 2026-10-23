import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const SOURCES = {
  bell: require('../../assets/sounds/bell.wav'),
  bellEnd: require('../../assets/sounds/bell-end.wav'),
  clapper: require('../../assets/sounds/clapper.wav'),
  beep: require('../../assets/sounds/beep.wav'),
  go: require('../../assets/sounds/beep-go.wav'),
};
export type SoundName = keyof typeof SOURCES;

let players: Partial<Record<SoundName, AudioPlayer>> = {};
let modeSet = false;

function player(name: SoundName) {
  return (players[name] ??= createAudioPlayer(SOURCES[name]));
}

/**
 * Call from a tap (e.g. Start): browsers and iOS only allow audio that a gesture unlocked.
 * Primes every sound silently so later bells can play on their own.
 */
export function unlockSounds() {
  if (!modeSet) {
    modeSet = true;
    // Ring even with the phone's silent switch on: it's a gym timer.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    const p = player(name);
    try {
      p.volume = 0;
      p.play();
      p.pause();
      void p.seekTo(0);
      p.volume = 1;
    } catch {
      // Audio unavailable: the timer still works silently.
    }
  }
}

export function playSound(name: SoundName) {
  try {
    const p = player(name);
    p.volume = 1;
    void p.seekTo(0).then(() => p.play(), () => p.play());
  } catch {
    // Ignore: sound is a nicety.
  }
}

export function releaseSounds() {
  for (const p of Object.values(players)) p?.remove();
  players = {};
}
