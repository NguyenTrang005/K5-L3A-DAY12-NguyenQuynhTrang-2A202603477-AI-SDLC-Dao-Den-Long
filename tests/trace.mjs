import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };

export function trace(t, { night = 1, ticks = 1, frames = [], scenario = {}, cadence = 1 }) {
  const path = mkdtempSync(join(tmpdir(), 'night-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  const scenarioFile = join(path, 'scenario.json');
  const inputsFile = join(path, 'inputs.json');
  const outputFile = join(path, 'trace.jsonl');
  writeFileSync(scenarioFile, JSON.stringify({ ...quiet, ...scenario }));
  writeFileSync(inputsFile, JSON.stringify({ frames }));
  const result = spawnSync(process.execPath, ['src/headless.mjs', '--seed', '42', '--night', String(night),
    '--ticks', String(ticks), '--scenario', scenarioFile, '--inputs', inputsFile, '--out', outputFile,
    '--snapshot-every', String(cadence)], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const rows = readFileSync(outputFile, 'utf8').trim().split('\n').map(JSON.parse);
  const snapshots = new Map(rows.filter(row => row.type === 'snapshot').map(row => [row.tick, row]));
  return { at: tick => snapshots.get(tick), events: rows.filter(row => row.type === 'event'), end: rows.at(-1) };
}
