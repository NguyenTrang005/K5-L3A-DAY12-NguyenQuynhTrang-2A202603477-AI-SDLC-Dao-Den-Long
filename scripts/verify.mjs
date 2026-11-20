import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const reportDir = resolve(process.argv[2] ?? 'dist/proof/phase-1');

function run(args) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  assert.equal(result.status, 0, args.join(' ') + ' thất bại');
  return result.stdout;
}

run(['scripts/build.mjs']);
mkdirSync(reportDir, { recursive: true });
const results = run(['--test', '--test-reporter=tap']);
writeFileSync(join(reportDir, 'tests.tap'), results);

const replayFile = join(reportDir, 'last-lantern.jsonl');
run([
  'src/headless.mjs', '--seed', '7', '--night', '1', '--ticks', '100', '--out', replayFile,
  '--scenario', 'tests/fixtures/last-lantern.scenario.json',
  '--inputs', 'tests/fixtures/last-lantern.inputs.json'
]);
const result = JSON.parse(readFileSync(replayFile, 'utf8').trim().split('\n').at(-1));
assert.deepEqual(result, { type: 'end', ticks: 61, state: 'won', score: 316 });
console.log('Kết quả headless:', result);
console.log('Bằng chứng được lưu tại', reportDir);
