import * as C from '../src/features/boxer/clips';
import { GUARD, mirrorSkeleton, solvePose } from '../src/features/boxer/rig';
import { StrikeDetector } from '../src/features/tracking/detector';
import { DEFAULT_CAMERA, skeletonToImage, skeletonToLandmarks } from '../src/features/tracking/landmarks';
import { mulberry32 } from './sim';
const [name, az = '-1', fps = '30', stance = 'orthodox', seed = '7'] = process.argv.slice(2);
const cam = { ...DEFAULT_CAMERA, azimuth: stance === 'southpaw' ? -+az : +az };
const clip = (C as any)[name] as C.Clip;
const det = new StrikeDetector(stance as any);
det.debug = (i) => console.log('  window', JSON.stringify(i));
const rand = mulberry32(+seed);
for (let t = 0; t < 1 + clip.duration + 1; t += 1 / +fps) {
  const base = t < 1 ? GUARD : C.sampleClip(clip, t - 1);
  let sk = solvePose({ ...base, drop: base.drop + 0.012 * Math.sin(t * 5) });
  if (stance === 'southpaw') sk = mirrorSkeleton(sk);
  for (const e of det.push(t * 1000, skeletonToImage(sk, cam, 0.004, rand), cam.aspect, skeletonToLandmarks(sk, 0.01, 0.03, rand, cam.azimuth))) console.log(Math.round(t * 1000), e.label);
}
