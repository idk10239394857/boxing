/** Usage: node tests/e2e/extract-run.mjs <site-dir-with-mediapipe/> <video> <out.json> [lite|full] */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const [site, video, out, model = 'full'] = process.argv.slice(2).map((p, i) => (i < 3 ? path.resolve(p) : p));
const here = path.dirname(fileURLToPath(import.meta.url));
execFileSync(path.resolve(here, '../../node_modules/.bin/esbuild'), [path.join(here, 'extract.ts'), '--bundle', '--format=iife', `--outfile=${path.join(site, 'extract.js')}`]);
fs.writeFileSync(path.join(site, 'extract.html'), '<!doctype html><body><script src="extract.js"></script></body>');
fs.copyFileSync(video, path.join(site, 'input.webm'));
const server = spawn('python3', ['-m', 'http.server', '8096', '-d', site], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:8096/extract.html');
  const json = await page.evaluate(([m]) => window.extractLandmarks('/input.webm', m, 30), [model]);
  fs.writeFileSync(out, json);
  console.log('frames:', JSON.parse(json).length);
} finally {
  await browser.close();
  server.kill();
}
