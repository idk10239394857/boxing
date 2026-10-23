/** Render the test reel (solo or sparring) to a frame-exact .y4m for Chromium's fake webcam.
 *  Usage: node tests/e2e/make-y4m.mjs <out.y4m> [solo|sparring] [azimuth] */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const [out, mode = 'solo', az] = process.argv.slice(2);
const here = path.dirname(fileURLToPath(import.meta.url));
const site = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-y4m-'));
execFileSync(path.resolve(here, '../../node_modules/.bin/esbuild'), [path.join(here, 'reel.ts'), '--bundle', '--format=iife', `--outfile=${site}/reel.js`], { stdio: 'ignore' });
fs.writeFileSync(`${site}/index.html`, '<!doctype html><body><script src="reel.js"></script></body>');
const server = spawn('python3', ['-m', 'http.server', '8089', '-d', site], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:8089/');
  const azimuth = az !== undefined ? Number(az) : mode === 'sparring' ? 0 : -0.5;
  const { frames, header } = await page.evaluate((o) => window.setupY4M(o), { width: 480, height: 360, azimuth, mode });
  const fd = fs.openSync(out, 'w');
  fs.writeSync(fd, header);
  for (let i = 0; i < frames; i += 30) {
    const b64 = await page.evaluate(([s, c]) => window.y4mFrames(s, c), [i, Math.min(30, frames - i)]);
    fs.writeSync(fd, Buffer.from(b64, 'base64'));
  }
  fs.closeSync(fd);
  console.log(`${out}: ${frames} frames (${(fs.statSync(out).size / 1e6).toFixed(0)} MB)`);
} finally {
  await browser.close();
  server.kill();
}
