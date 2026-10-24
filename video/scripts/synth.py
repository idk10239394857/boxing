"""Synth voices shared by the launch-video mixes."""
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

