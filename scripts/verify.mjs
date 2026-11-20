import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cpus, release, tmpdir } from 'node:os';

const reportDir = resolve(process.argv[2] ?? 'dist/proof/phase-2');

function run(args) {
  const start = performance.now();
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const seconds = (performance.now() - start) / 1000;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  assert.equal(result.status, 0, args.join(' ') + ' thất bại');
  return { stdout: result.stdout, seconds };
}

function replay(night, ticks, title, args, seed = 42, directory = reportDir) {
  const path = join(directory, title + '.jsonl');
  const result = run(['src/headless.mjs', '--seed', String(seed), '--night', String(night), '--ticks', String(ticks), '--out', path, ...args]);
  const rows = readFileSync(path, 'utf8').trim().split('\n').map(JSON.parse);
  return { ...result, rows, end: rows.at(-1) };
}

run(['scripts/build.mjs']);
mkdirSync(reportDir, { recursive: true });
const { stdout: results } = run(['--test', '--test-reporter=tap']);
writeFileSync(join(reportDir, 'tests.tap'), results);

const regression = replay(1, 100, 'night1-standard', [
  '--scenario', 'tests/fixtures/night1-standard.scenario.json', '--inputs', 'tests/fixtures/night1-standard.inputs.json'
]);
assert.deepEqual(regression.end, { type: 'end', ticks: 91, state: 'won', score: 406 });
console.log('Hồi quy Đêm 1:', regression.end);

const bridge = replay(2, 225, 'cau-bridge', [
  '--scenario', 'tests/fixtures/cau-bridge.scenario.json', '--inputs', 'tests/fixtures/cau-bridge.inputs.json'
]);
assert.deepEqual(
  bridge.rows.filter(row => row.type === 'event').map(row => row.name),
  ['night_start', 'charm_picked', 'paused', 'resumed', 'dash']
);

const metrics = [18000, 19800, 21600].map((ticks, index) => {
  const night = index + 1;
  const directory = mkdtempSync(join(tmpdir(), 'phase2-perf-'));
  const args = ['--scenario', 'tests/fixtures/full-night.scenario.json'];
  const title = 'full-night-' + night;
  try {
    const trial = replay(night, ticks, title, args, 7, directory);
    assert.equal(trial.end.ticks, ticks);
    assert.equal(trial.end.state, 'lost');
    assert.equal(trial.rows.findLast(row => row.name === 'game_over').data.reason, 'dawn');
    assert.ok(trial.seconds <= 30, 'Đêm ' + night + ' vượt 30 giây');
    const proof = replay(night, ticks, title, [...args, '--snapshot-every', '900'], 7);
    assert.deepEqual(proof.end, trial.end);
    return { night, ticks, snapshot_every: 10, elapsed_s: Number(trial.seconds.toFixed(3)) };
  } finally {
    rmSync(join(directory, title + '.jsonl'), { force: true });
    rmdirSync(directory);
  }
});
writeFileSync(join(reportDir, 'headless-metrics.json'), JSON.stringify({
  os: process.platform, os_release: release(), cpu: cpus()[0]?.model, node: process.version, metrics
}, null, 2) + '\n');
console.log('Thời gian headless:', metrics);
console.log('Bằng chứng được lưu tại', reportDir);
