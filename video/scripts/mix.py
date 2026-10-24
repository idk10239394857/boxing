"""Sound bed for the 16:9 launch video: 120 BPM (one beat = 30 frames at 60 fps), cut points in frames."""
import sys, wave
import numpy as np
from synth import *

bell = load(sys.argv[1] + '/bell.wav')

# Hook: bell, riser into the drop at 2 s, word slams.
put(bell, 0.0, 0.9)
put(riser(1.6), 0.4, 1.0)
for f in (6, 36, 66): put(impact(), t_of(f), 0.55)

# Groove 2 s .. 13 s.
beat = 0.5
for b in range(4, 26):
    at = b * beat
    put(kick(), at, 0.9)
    if b % 2 == 1: put(clap(), at, 0.8)
    put(hat(), at + beat / 2, 1.0)
    put(hat(b % 4 == 3), at + beat * 0.75, 0.6)
    if b % 4 == 0:
        put(sub(55 if (b // 4) % 2 == 0 else 49, 1.9), at, 1.0)

# Sidechain duck on everything but the kick (applied approximately: dip after each kick).
duck = np.ones(N)
for b in range(4, 26):
    i = int(b * beat * SR); n = int(0.18 * SR)
    duck[i : i + n] = np.minimum(duck[i : i + n], 0.55 + 0.45 * np.linspace(0, 1, n) ** 0.7)
out *= duck

# Shadow Cam punches and the slip.
for f in (150, 180, 210, 240, 300, 315, 330): put(punch(), t_of(f), 0.85)
put(whoosh(0.25), t_of(268), 0.5)
# Transitions.
for f, g in ((102, 0.9), (372, 0.9), (582, 0.8), (775, 1.0)): put(whoosh(0.4), t_of(f), g)
for f in (600, 660, 720): put(impact(), t_of(f), 0.35)
# Phone callouts and the roadmap grid.
for f in (440, 465, 490, 530, 550): put(tick(), t_of(f), 1.0)
for k in range(0, 36, 3): put(tick(), t_of(672 + k * 1.2), 0.6)
# End card: impact on the logo, the bell on "Live now".
put(impact(), t_of(792), 1.0)
put(impact(), t_of(800), 0.6)
put(bell, t_of(838), 1.0)

out = out / max(1e-9, np.max(np.abs(out))) * 0.89
out = np.tanh(out * 1.15) / np.tanh(1.15)
pcm = (out * 32767).astype(np.int16)
w = wave.open(sys.argv[2], 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
print('wrote', sys.argv[2], len(pcm) / SR, 's')
