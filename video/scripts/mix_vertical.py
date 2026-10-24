"""Sound bed for the 9:16 cut: eighth-note hype hits for 3 s, a gap, the drop at frame 180, then the groove."""
import sys, wave
import numpy as np
from synth import *

def stab(freq, dur=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    saw = sum(np.sin(2 * np.pi * freq * k * t) / k for k in range(1, 8))
    return np.tanh(1.8 * saw) * env(n, 0.002, 0.09) * 0.35

bell = load(sys.argv[1] + '/bell.wav')

# 0..2 s: a hit on every cut (eighth notes), pitch climbing, riser underneath.
put(bell, 0.0, 0.8)
for i, f in enumerate(range(0, 120, 15)):
    put(kick(), t_of(f), 0.7 + i * 0.04)
    put(clap(), t_of(f), 0.35 + i * 0.05)
    put(stab(110 * 2 ** (i / 6)), t_of(f), 0.7)
put(riser(2.6), 0.3, 1.2)
# "Counted.": big hit, then a beat of near-silence before the drop.
put(impact(), t_of(120), 1.0)
put(stab(220), t_of(120), 0.9)
put(whoosh(0.5, True), t_of(152), 1.0)

# Drop at 3 s and the groove to 13.5 s (16th hats for pace).
beat = 0.5
for b in range(6, 27):
    at = b * beat
    put(kick(), at, 1.0)
    if b % 2 == 1: put(clap(), at, 0.85)
    for q in range(4): put(hat(q == 2), at + q * beat / 4, 0.8 if q % 2 else 0.5)
    if b % 4 == 2: put(sub(55 if (b // 4) % 2 == 0 else 49, 1.9), at, 1.0)
put(impact(), 3.0, 1.0)

duck = np.ones(N)
for b in range(6, 27):
    i = int(b * beat * SR); n = int(0.16 * SR)
    duck[i : i + n] = np.minimum(duck[i : i + n], 0.5 + 0.5 * np.linspace(0, 1, n) ** 0.7)

out *= duck

# Shadow Cam hits and the slip.
for f in (195, 210, 225, 255, 270, 330, 345, 360, 375): put(punch(), t_of(f), 0.9)
put(whoosh(0.25), t_of(296), 0.5)
# Slash cuts and the phone dive.
for f in (408, 678, 738, 798): put(whoosh(0.3), t_of(f), 0.9)
put(whoosh(0.35), t_of(612), 0.9)
for f in (630, 690, 750): put(impact(), t_of(f), 0.4)
# Tags popping on the phone, the roadmap ticks.
for f in (450, 475, 532, 562): put(tick(), t_of(f), 1.0)
for k in range(0, 36, 3): put(tick(), t_of(686 + k * 1.1), 0.6)
# End card.
put(impact(), t_of(804), 1.0)
put(impact(), t_of(812), 0.6)
put(bell, t_of(866), 1.0)

mix = out / max(1e-9, np.max(np.abs(out))) * 0.9
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
w = wave.open(sys.argv[2], 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print('wrote', sys.argv[2])
