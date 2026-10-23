/**
 * End-to-end check of Shadow Cam with real MediaPipe:
 *   1. render the 3D boxer performing a scripted reel and record it to WebM;
 *   2. load the exported web app, open Shadow Cam → "Analyze a video" with that file;
 *   3. compare detected punches with the reel's ground truth.
 *
 * Usage: node tests/e2e/run-e2e.mjs <exported-web-dir> <mediapipe-assets-dir> <work-dir>
 *   mediapipe-assets-dir holds wasm/ and pose_landmarker_{lite,full}.task
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const [appDir, mpDir, work] = process.argv.slice(2).map((p) => path.resolve(p));
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const site = path.join(work, 'site');
const PORT = 8097;

fs.rmSync(site, { recursive: true, force: true });
fs.cpSync(appDir, site, { recursive: true });
fs.cpSync(mpDir, path.join(site, 'mediapipe'), { recursive: true });
const index = path.join(site, 'index.html');
fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('<head>', `<head><script>window.__FF_MEDIAPIPE_BASE__='/mediapipe';window.__FF_MEDIAPIPE_DELEGATE__='CPU'</script>`));
execFileSync(path.join(root, 'node_modules/.bin/esbuild'), [path.join(here, 'reel.ts'), '--bundle', '--format=iife', `--outfile=${path.join(site, 'reel.js')}`]);
fs.writeFileSync(path.join(site, 'reel.html'), '<!doctype html><body style="margin:0;background:#000"><script src="reel.js"></script></body>');

const server = spawn('python3', ['-m', 'http.server', String(PORT), '-d', site], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});

async function main() {
  // 1. Record the reel.
  const rp = await browser.newPage();
  await rp.goto(`http://localhost:${PORT}/reel.html`);
  const expected = await rp.evaluate(() => window.expected);
  // Face the fighter's chest (the stance is bladed ~35° toward the lead side).
  const azimuth = Number(process.env.AZIMUTH ?? -0.5); // the recommended placement
  const view = {
    azimuth,
    bare: !!process.env.BARE,
    ...(process.env.DISTANCE ? { distance: Number(process.env.DISTANCE) } : {}),
    ...(process.env.SQUARE ? { square: true } : {}),
    ...(process.env.SHIRT ? { shirt: process.env.SHIRT } : {}),
    ...(process.env.TARGET_Y ? { targetY: Number(process.env.TARGET_Y) } : {}),
  };
  const b64 = await rp.evaluate((v) => window.recordReel({ width: 960, height: 720, ...v }), view);
  const video = path.join(work, 'reel.webm');
  fs.writeFileSync(video, Buffer.from(b64, 'base64'));
  await rp.screenshot({ path: path.join(work, 'reel-frame.png') });
  console.log(`recorded ${video} (${(fs.statSync(video).size / 1e6).toFixed(1)} MB)`);

  if (process.env.RECORD_ONLY) return;

  // 2. Analyse it in the app.
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://localhost:${PORT}/`);
  await page.getByText('Shadow Cam', { exact: true }).first().click();
  await page.getByText('Analyze a video').waitFor();
  await page.screenshot({ path: path.join(work, 'track-setup.png') });
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Analyze a video').click();
  await (await chooser).setFiles(video);

  // Collect the live feed as it updates (newest first).
  const seen = [];
  let lastShot = 0;
  const deadline = Date.now() + 900_000;
  while (Date.now() < deadline) {
    if (await page.getByText('Punches thrown').count()) break;
    const err = await page.getByText(/Couldn't load|not supported|failed/i).count();
    if (err) throw new Error(await page.locator('body').innerText());
    if (Date.now() - lastShot > 6000 && (await page.getByText('Live feed').count())) {
      lastShot = Date.now();
      await page.screenshot({ path: path.join(work, `track-live-${seen.length}.png`) });
    }
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(work, 'track-summary.png'), fullPage: true });
  const summary = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  console.log('expected:', expected.join(', '));
  console.log('summary :', summary.slice(summary.indexOf('PUNCHES THROWN') - 6, summary.indexOf('PUNCHES THROWN') + 260));

  // 3. Save it and check the stats landed.
  await page.getByText('Save session').click();
  await page.waitForTimeout(800);
  await page.getByText('Strikes', { exact: true }).first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(work, 'after-save-strikes.png') });
  const strikes = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  console.log('strikes :', strikes.slice(strikes.indexOf('TOTAL THROWN') - 12, strikes.indexOf('TOTAL THROWN') + 14));
  console.log('errors  :', errors);
}

try {
  await main();
} finally {
  await browser.close();
  server.kill();
}
