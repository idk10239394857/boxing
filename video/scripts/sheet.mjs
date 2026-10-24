// Contact sheet: render chosen frames as stills from one bundle.
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
const id = process.env.COMP ?? 'FightFlowLaunch';
const frames = process.argv.slice(3).map(Number);
const out = process.argv[2];
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const composition = await selectComposition({ serveUrl, id, browserExecutable });
for (const frame of frames) {
  await renderStill({ composition, serveUrl, frame, output: `${out}/f${String(frame).padStart(3, '0')}.png`, browserExecutable, scale: 0.5 });
  console.log('frame', frame);
}
