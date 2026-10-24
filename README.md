# FIGHTFLOW

Gamified boxing training tracker. Expo + React Native + TypeScript, runs on iOS, Android and web (laptop). Dark mode only, no auth, no backend — everything persists on-device (AsyncStorage / localStorage on web).

## Run

```bash
npm install
npm run web       # laptop browser
npm start         # scan the QR with Expo Go (iOS / Android)
npm run typecheck
npm test          # detector tests (simulated + real MediaPipe recordings)
npm run build:site  # rebuild the deployed site into web/
```

## Deploy

Vercel serves the prebuilt `web/` folder (Root Directory `web`, no build step). After changing the app, run `npm run build:site`, commit `web/` and push to `main`.

## Screens

| Tab | What it does |
| --- | --- |
| **Fighter** | Avatar, rank, level + XP bar, FightStreak / sessions / rounds, Log Training CTA, round timer, 7-day volume chart, quote of the day, recent sessions, trophy case |
| **Techniques** | Searchable library (Punches / Defense / Footwork / Combos) → detail with coaching cues and *Mark as drilled* (+10 XP) |
| **Strikes** | Accuracy + distribution ring, per-punch cards (thrown / landed / land %), +/- tally logger |
| **Calendar** | Month view (trained = red, rest = dim, today = gold outline), day detail, log/delete sessions |
| **Roadmap** | Novice → Fundamentals → Contender → Sharp → Fight Ready; clearing a tier unlocks the next + 100 XP |

### Shadow Cam: camera punch tracking (web)

Home → **Shadow Cam** (or Strikes → *Auto-count with Shadow Cam*). Shadowbox or hit the bag in front of a camera, or upload a recorded video. MediaPipe Pose runs **on-device in the browser**, and `src/features/tracking/detector.ts` turns the joints into events:

- **Punches by hand:** jab, cross, lead/rear hook, lead/rear uppercut, body jab/cross, liver shot/body hook.
- **Head movement:** slips, rolls and ducks.
- **Session stats:** combos and punches per minute.

You can correct any count on the summary before saving. Saving logs the session, punch stats and drill credits (5+ clean reps of a technique).

**Camera placement matters:** put the camera **30–45° off to your rear-hand side** (right side if orthodox), 2–3 m away, with your whole body in frame. Punches thrown straight at the lens barely move in 2D and are hard to see. Very side-on placements hide your far arm.

How it's validated (`npm test`):

| Check | Result |
|---|---|
| Simulated pose streams from the 3D rig (26 techniques × 54 camera/fps/noise/stance variants) | ~86% exact labels; footwork and blocks never log a punch |
| Real MediaPipe output on rendered footage at the recommended angle (`tests/fixtures`) | 10/12 reel clips exactly right, bare-handed and gloved, zero phantom punches |
| Straight vs hook | the known weak spot from a single camera; the punch count and hand are right even when the type isn't |

Regenerate the footage and fixtures with `tests/e2e` (`run-e2e.mjs` records the 3D reel and runs it through the app; `extract-run.mjs` + `replay.ts` + `tune.ts` for detector work).

Native builds show the 3D demos as an SVG projection; live tracking currently runs in the browser (phone or laptop). A native camera frame processor would need a development build.

### 3D technique demos

Every technique opens with a 3D boxer performing it. You can drag to orbit, play at 1×, ½× or ¼× speed, pick 3/4, front or side views, and switch to southpaw. The rig (`src/features/boxer/rig.ts`) is procedural with two-bone IK: each technique in `clips.ts` is a few keyframes of glove and foot targets, hip turn, knee bend and lean.

Extras beyond the brief: **round timer** (presets, prep/rest phases, 10-second warning, vibration, keeps screen awake, "log these rounds" hand-off), **trophy case** achievements, rank titles per level, XP toasts, editable fighter name/avatar, data reset.

## Gamification

Tunable in `src/lib/gamification.ts`:

- XP: +50 per session, +5 per round, +10 per technique drilled, +100 per tier cleared
- Levels: going from Level N to N+1 costs `N × LEVEL_STEP` (500) XP — L2 at 500, L3 at 1,500, L4 at 3,000…
- FightStreak: consecutive days with ≥1 session, ending today (or yesterday, if today isn't logged yet). Recomputed on launch / foreground, so it breaks correctly after missed days.
- Level-ups and tier clears trigger a full-screen confetti modal.

## Code map

```
src/app/            Expo Router routes: (tabs)/*, log-session, technique/[id], timer, profile
src/components/     ui/ primitives (Text, Card, Progress rings/bars, Button, Stepper, Chip) + per-screen pieces
src/data/           seed data: techniques, roadmap tiers/skills, session & punch types, quotes, demo fighter
src/lib/            gamification rules, date helpers, achievements, round-timer hook
src/store/          zustand store (persisted) + memoized selectors
src/features/boxer/ 3D rig, technique animations, three.js scene (web) + SVG fallback (native)
src/features/tracking/ MediaPipe pose → strike/defense detector, Shadow Cam UI pieces
tests/              detector tests, simulator, MediaPipe fixtures, e2e tooling
```

Static content (technique text, roadmap skills) lives in `src/data`; the store only persists progress (drill counts, checked skills, sessions, punch totals), so editing seed content never needs a migration.

Rename: change `name` in `app.json` and the `FIGHTFLOW` title in `src/app/(tabs)/index.tsx`.

## Launch video

`video/` is the 15 s launch video, built in code with Remotion (1920x1080, 60 fps, 120 BPM: one beat = 30 frames).

```bash
cd video
npm install
npm run studio                       # preview and scrub
python3 scripts/mix.py ../assets/sounds public/mix.wav   # rebuild the synced sound bed
npm run render                       # 16:9, writes out/fightflow-launch.mp4
npm run render:vertical              # 9:16 for Reels and TikTok
python3 scripts/mix_vertical.py ../assets/sounds public/mix-vertical.wav   # the 9:16 sound bed
```

The finished file is `marketing/fightflow-launch.mp4`.

## FightFlow Pro (2.0): paywall and Stripe subscriptions

The app opens on a paywall (`src/features/paywall`). Subscribers pay through Stripe Checkout, and the app unlocks only after the server confirms the subscription with Stripe. The free 1.0 build is kept on the `v1` branch.

How it works:

- `GET /api/entitlement` tells the app whether this device is unlocked and, if not, the live prices from Stripe.
- `POST /api/checkout` creates a Stripe Checkout Session (subscription, optional free trial, promo codes allowed) and the browser goes to Stripe's hosted page.
- Stripe returns the buyer to `/api/checkout-return`, which looks the session up server-side; only a completed checkout with an active or trialing subscription earns the access pass.
- The access pass is an HttpOnly, Secure cookie sealed with AES-GCM under `ACCESS_SECRET` (30 days). About once a day it is re-checked with Stripe, so cancellations and unpaid subscriptions lock the app; a Stripe outage never does.
- `POST /api/portal` opens Stripe's customer portal (Profile → Manage subscription). `/api/logout` signs a device out.
- `POST /api/restore` emails a 15-minute sign-in link to an existing subscriber on a new device (needs Resend; hidden until configured).
- The Stripe secret key lives only in Vercel's server environment. Nothing secret is in the app bundle.

Vercel environment variables (Production and Preview):

| Variable | What it is |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` while testing, `sk_live_…` to sell). Sensitive. |
| `ACCESS_SECRET` | Random string, 32+ characters. Sensitive. Changing it signs everyone out. |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | Price IDs of the two plans (either can be left out). |
| `STRIPE_TRIAL_DAYS` | Optional free trial length. |
| `RESEND_API_KEY`, `RESTORE_FROM_EMAIL` | Optional: turn on "Restore purchase" emails. |

Tests: `tests/paywall.test.ts` runs the whole flow against a fake Stripe (`npm test`).
