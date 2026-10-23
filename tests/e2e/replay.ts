/** Replay a recorded MediaPipe stream through the detector. Usage: tsx replay.ts <file.json[.gz]> [v] */
import { loadRecording, scoreRecording } from './score';

const [file, verbose] = process.argv.slice(2);
const r = scoreRecording(loadRecording(file), verbose ? (i) => console.log('   ', JSON.stringify(i)) : undefined);
for (const c of r.clips) console.log(`${c.ok ? '✓' : '✗'} ${c.name.padEnd(11)} @${c.start.toFixed(1)}s want ${c.labels.join('+').padEnd(26)} got ${c.got.join('+') || '-'}`);
console.log(`clips ${Math.round(r.accuracy * 100)}% · counts ${Math.round(r.countAccuracy * 100)}% · stray ${r.stray.length}${r.stray.length ? ': ' + r.stray.map((g) => `${g.label}@${(g.t / 1000).toFixed(1)}`).join(', ') : ''}`);
