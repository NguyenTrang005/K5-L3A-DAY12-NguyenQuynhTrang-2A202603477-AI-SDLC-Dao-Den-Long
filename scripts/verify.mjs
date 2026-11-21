import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cpus, release, tmpdir } from 'node:os';

const reportDir = resolve(process.argv[2] ?? 'dist/proof/phase-4');

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

const regression = replay(1, 100, 'dawn-standard', [
  '--scenario', 'tests/fixtures/dawn-standard.scenario.json', '--inputs', 'tests/fixtures/night1-standard.inputs.json'
]);
assert.deepEqual(regression.end, { type: 'end', ticks: 96, state: 'won', score: 1041 });
console.log('Hồi quy Đêm 1:', regression.end);

const bridge = replay(2, 225, 'cau-bridge', [
  '--scenario', 'tests/fixtures/cau-bridge.scenario.json', '--inputs', 'tests/fixtures/cau-bridge.inputs.json'
]);
assert.deepEqual(
  bridge.rows.filter(row => row.type === 'event').map(row => row.name),
  ['night_start', 'charm_picked', 'paused', 'resumed', 'dash']
);

const fuel = replay(1, 240, 'fuel-drain', [
  '--scenario', 'tests/fixtures/fuel-drain.scenario.json', '--inputs', 'tests/fixtures/fuel-drain.inputs.json'
]);
assert.equal(fuel.end.state, 'won');
assert.ok(['lantern_out', 'fuel_drain', 'refuel'].every(name => fuel.rows.some(row => row.name === name)));

const metrics = [14400, 16200, 18000].map((ticks, index) => {
  const night = index + 1;
  const directory = mkdtempSync(join(tmpdir(), 'phase3-perf-'));
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
const soakReport = join(reportDir, 'soak.json');
run(['--expose-gc', '--max-semi-space-size=1', 'scripts/soak.mjs', '--seed', '7', '--nights', '10', '--out', soakReport]);
const soak = JSON.parse(readFileSync(soakReport, 'utf8'));
assert.equal(soak.results.length, 10);
assert.equal(soak.crashes, 0);
if (soak.mem_end_mb > 1.2 * soak.mem_start_mb) {
  console.warn('RSS soak vượt ngưỡng 20% trên máy này. Xem số đo đã lưu.');
}
console.log('Bằng chứng được lưu tại', reportDir);
