"""Sound bed for the launch video: 120 BPM (one beat = 30 frames at 60 fps), cut points in frames."""
import wave, sys
import numpy as np

SR, DUR, FPS = 44100, 15.0, 60
N = int(SR * DUR)
out = np.zeros(N)
rng = np.random.default_rng(7)
t_of = lambda f: f / FPS

def put(sig, at_s, gain=1.0):
    i = int(at_s * SR)
    if i >= N: return
    seg = sig[: N - i] * gain
    out[i : i + len(seg)] += seg

def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)

def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 42 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.16) * 1.0

def clap():
    n = int(0.25 * SR); s = rng.standard_normal(n)
    s = np.convolve(s, np.ones(6) / 6, 'same') - np.convolve(s, np.ones(60) / 60, 'same')
    e = sum(env(n, 0.0005, 0.012) * (np.arange(n) >= k * 0.009 * SR) for k in range(3)) + env(n, 0.001, 0.07)
    return s * e * 0.55

def hat(open_=False):
    n = int((0.12 if open_ else 0.04) * SR); s = rng.standard_normal(n)
    s = s - np.convolve(s, np.ones(4) / 4, 'same')
    return s * env(n, 0.0005, 0.05 if open_ else 0.012) * 0.22

def sub(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.tanh(2.2 * np.sin(2 * np.pi * freq * t)) * 0.32
    return s * np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.05)

def whoosh(dur=0.45, up=True):
    n = int(dur * SR); s = rng.standard_normal(n); out_ = np.zeros(n)
    t = np.arange(n) / SR; k = t / dur
    a = 0.02 + (0.5 * (k if up else 1 - k)) ** 2  # sweeping one-pole lowpass
    y = 0.0
    for i in range(n):
        y += a[i] * (s[i] - y); out_[i] = y
    shape = np.sin(np.pi * np.clip(k, 0, 1)) ** 1.5
    return out_ * shape * 1.4

def impact():
    n = int(0.6 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (38 + 60 * np.exp(-t * 18)) * t) * env(n, 0.001, 0.25)
    snap = rng.standard_normal(n) * env(n, 0.0005, 0.02) * 0.5
    return (body + snap) * 0.9

def punch():
    n = int(0.22 * SR); t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * (70 + 120 * np.exp(-t * 40)) * t) * env(n, 0.001, 0.06)
    s = rng.standard_normal(n); s = s - np.convolve(s, np.ones(3) / 3, 'same')
    return thud * 0.8 + s * env(n, 0.0005, 0.015) * 0.6

def tick():
    n = int(0.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2400 * t) * env(n, 0.0005, 0.006) * 0.25

def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 200 * (8 ** (t / dur)); tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.08
    return (whoosh(dur, True) * 0.7 + tone) * (t / dur) ** 2

def load(path):
    w = wave.open(path); a = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
    return a

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
