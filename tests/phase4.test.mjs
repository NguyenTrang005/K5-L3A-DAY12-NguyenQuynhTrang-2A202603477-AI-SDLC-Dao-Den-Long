import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { recordResult, topEntries, validName } from '../src/leaderboard.mjs';
import { createBenchmarkGame, renderMetrics } from '../web/benchmark.mjs';
import { DEFAULT_BINDINGS, actionForCode, assignBinding, storedBindings } from '../web/controls.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));

test('benchmark v1.3 giữ đúng 200 Bóng, 100 đom đóm, 3 đèn đầy, và chạy wander', () => {
  const game = createBenchmarkGame(contract.tuning, 42);
  const before = game.snapshot();
  assert.equal(contract.contract_version, '1.3');
  assert.equal(before.shades.length, 200);
  assert.equal(before.motes.length, 100);
  assert.equal(new Set(before.motes.map(mote => JSON.stringify(mote.pos))).size, 100);
  for (let tick = 0; tick < 1300; tick++) game.stepBenchmark();
  const after = game.snapshot();
  assert.equal(after.state, 'playing');
  assert.deepEqual(after.player, before.player);
  assert.deepEqual(after.lanterns, before.lanterns);
  assert.deepEqual(after.lanterns.filter(lamp => lamp.lit).map(lamp => [lamp.id, lamp.fuel]),
    [['L1', 100], ['L2', 100], ['L3', 100]]);
  assert.deepEqual(after.motes, before.motes);
  assert.equal(after.shades.length, 200);
  assert.ok(after.shades.every(actor => actor.state === 'wander'));
  assert.notDeepEqual(after.shades.map(actor => actor.pos), before.shades.map(actor => actor.pos));
});

test('benchmark tính FPS từ thời gian thật, phân vị 95 và trung bình 1% khung hình chậm nhất', () => {
  assert.deepEqual(renderMetrics([...Array(198).fill(10), 40, 60]), {
    avg_fps: 96.15, p1_low_fps: 20, frame_ms_p95: 10, frames: 200
  });
  assert.throws(() => renderMetrics([]), /Không thu/);
});

test('bảng điểm kiểm tra tên, giới hạn 10 và dùng thời điểm thực khi hòa điểm', () => {
  assert.equal(validName('May_42'), true);
  assert.equal(validName('Mây!'), false);
  assert.equal(validName('ab'), false);
  const date = new Date('2026-11-21T04:00:00Z');
  const results = Array.from({ length: 12 }, (_, index) => ({
    name: 'Player_' + index, score: index + 30, nights_won: 2,
    achieved_at: '2026-11-21T05:00:00Z', seed: 42
  }));
  const top = recordResult(results, { name: 'May_42', score: 41, nights_won: 1, seed: 12 }, date);
  assert.equal(top.length, 10);
  assert.deepEqual(top.slice(0, 2).map(entry => entry.name), ['May_42', 'Player_11']);
  assert.deepEqual(topEntries([top[1], { ...top[0], achieved_at: '2026-11-21T10:00:00+07:00' }])
    .map(entry => entry.name), ['May_42', 'Player_11']);
});

test('bảng điểm đã lưu có thể xuất đúng thứ tự từ tiến trình khác', t => {
  const directory = mkdtempSync(join(tmpdir(), 'lantern-scores-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const out = join(directory, 'export.json');
  const env = { ...process.env, LANTERN_LEADERBOARD_FILE: join(directory, 'scores.json') };
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { addToLeaderboard } from './scripts/leaderboard-file.mjs';
    addToLeaderboard({ name: 'May_low', score: 70, nights_won: 1, seed: 7 });
    addToLeaderboard({ name: 'May_top', score: 150, nights_won: 3, seed: 42 });
  `], { cwd: root, env });
  execFileSync(process.execPath, ['scripts/serve.mjs', '--export-leaderboard', out], { cwd: root, env });
  const { entries } = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(entries.map(result => [result.name, result.score, result.nights_won, result.seed]),
    [['May_top', 150, 3, 42], ['May_low', 70, 1, 7]]);
  assert.ok(entries.every(result => result.achieved_at.endsWith('Z')));
});

test('đổi từng hành động, phát hiện trùng, và đọc lại cấu hình đã lưu', () => {
  let bindings = { ...DEFAULT_BINDINGS };
  for (const [index, action] of Object.keys(DEFAULT_BINDINGS).entries()) {
    bindings = assignBinding(bindings, action, 'Digit' + (index + 1));
    assert.equal(actionForCode(bindings, 'Digit' + (index + 1)), action);
  }
  assert.deepEqual(storedBindings(JSON.parse(JSON.stringify(bindings))), bindings);
  assert.throws(() => assignBinding(bindings, 'jump', 'Digit1'), /đang dùng/);
  assert.deepEqual(storedBindings({ jump: 'KeyW' }), DEFAULT_BINDINGS);
  assert.equal(actionForCode(DEFAULT_BINDINGS, 'KeyP'), 'pause');
  assert.equal(actionForCode(DEFAULT_BINDINGS, 'ShiftRight'), 'dash');
});
