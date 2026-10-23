"""Synthesize the round-timer sounds (boxing bell, clapper, beep) as 16-bit mono WAVs."""
import numpy as np, wave, sys
SR = 44100
def save(name, x):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    with wave.open(f'assets/sounds/{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
def bell(f0=830, dur=2.2):
    t = np.arange(int(SR * dur)) / SR
    # inharmonic bell partials with faster decay on the high ones
    parts = [(1.0, 1.0, 1.2), (2.76, 0.6, 2.2), (5.40, 0.35, 3.5), (8.93, 0.2, 5.0), (0.5, 0.25, 0.8)]
    x = sum(a * np.exp(-d * t) * np.sin(2 * np.pi * f0 * r * t) for r, a, d in parts)
    strike = np.exp(-t * 60) * np.random.default_rng(1).normal(0, 0.4, len(t))
    return x + strike
def ding_ding_ding():
    one = bell(dur=0.45)
    gap = np.zeros(int(SR * 0.05))
    return np.concatenate([one, gap, one, gap, bell(dur=1.6)])
def clapper():
    t = np.arange(int(SR * 0.06)) / SR
    knock = np.random.default_rng(2).normal(0, 1, len(t)) * np.exp(-t * 90) + 0.6 * np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 70)
    gap = np.zeros(int(SR * 0.12))
    return np.concatenate([knock, gap, knock, gap, knock])
def beep(f=880, dur=0.14):
    t = np.arange(int(SR * dur)) / SR
    env = np.minimum(1, t * 200) * np.minimum(1, (dur - t) * 200)
    return np.sin(2 * np.pi * f * t) * env
save('bell', bell())
save('bell-end', ding_ding_ding())
save('clapper', clapper())
save('beep', beep())
save('beep-go', beep(1320, 0.3))
