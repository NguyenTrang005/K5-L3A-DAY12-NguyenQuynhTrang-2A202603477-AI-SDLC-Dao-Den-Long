import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { DEFAULT_INPUT, Game, TICK_RATE } from '../src/game.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { tuning } = JSON.parse(readFileSync(join(root, 'game.contract.json'), 'utf8'));
const quiet = { random_motes: false, random_shades: false };
const edgesOff = { ...DEFAULT_INPUT };
const gameFor = scenario => new Game(tuning, { scenario: { ...quiet, ...scenario } });

function replay(t, { seed = 7, ticks = 100, cadence = 10 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dao-den-long-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const out = join(dir, 'run.jsonl');
  function run(extraArgs) {
    return spawnSync(process.execPath, [
      'src/headless.mjs', '--seed', String(seed), '--night', '1',
      '--ticks', String(ticks), '--out', out, '--snapshot-every', String(cadence), ...extraArgs
    ], { cwd: root, encoding: 'utf8' });
  }
  return { dir, run, output: () => readFileSync(out, 'utf8') };
}

test('headless thắng bằng nhặt bốn đom đóm rồi thắp đèn cuối, dừng đúng tick', t => {
  const trial = replay(t, { seed: -7 });
  const result = trial.run([
    '--scenario', 'tests/fixtures/last-lantern.scenario.json',
    '--inputs', 'tests/fixtures/last-lantern.inputs.json'
  ]);
  assert.equal(result.status, 0, result.stderr);
  const rows = trial.output().trim().split('\n').map(JSON.parse);
  const first = rows[0];
  assert.equal(first.type, 'snapshot');
  assert.equal(first.tick, 0);
  assert.equal(first.score, 0);
  assert.equal(first.lanterns.length, 5);
  assert.equal(first.lanterns.filter(lantern => lantern.lit).length, 4);
  assert.deepEqual(rows.filter(row => row.type === 'snapshot').map(row => row.tick), [0, 10, 20, 30, 40, 50, 60]);
  assert.deepEqual(rows.filter(row => row.name === 'mote_picked').map(row => row.data.carried), [1, 2, 3, 4]);
  assert.deepEqual(rows.filter(row => row.type === 'event').slice(-3), [
    { type: 'event', tick: 61, name: 'deposit', data: { lantern_id: 'L1', amount: 4, deposited: 4 } },
    { type: 'event', tick: 61, name: 'lantern_lit', data: { lantern_id: 'L1' } },
    { type: 'event', tick: 61, name: 'game_over', data: { result: 'won', reason: 'all_lit' } }
  ]);
  assert.deepEqual(rows.at(-1), { type: 'end', ticks: 61, state: 'won', score: 316 });
});

test('headless giữ nguyên input vắng mặt, xoay hướng và chuẩn hóa chuyển động chéo', t => {
  const trial = replay(t, { ticks: 4, cadence: 1 });
  const inputs = join(trial.dir, 'inputs.json');
  writeFileSync(inputs, JSON.stringify({ frames: [
    { tick: 0, move: [1, 1], cam_yaw_deg: 90 },
    { tick: 1, jump: true },
    { tick: 3, move: [0, 0] }
  ] }));
  const result = trial.run(['--inputs', inputs]);
  assert.equal(result.status, 0, result.stderr);
  const snapshots = trial.output().trim().split('\n').map(JSON.parse).filter(row => row.type === 'snapshot');
  for (let tick = 0; tick <= 4; tick++) {
    assert.equal(snapshots[tick].sim_tick, tick);
    assert.equal(snapshots[tick].time_left_s, tuning.night1_duration_s - tick / TICK_RATE);
    const expected = Number((Math.min(tick, 3) * tuning.player_speed / TICK_RATE / Math.SQRT2).toFixed(3));
    assert.equal(snapshots[tick].player.pos[0], expected);
    assert.equal(snapshots[tick].player.pos[2], expected === 0 ? 0 : -expected);
  }
  assert.equal(snapshots[1].player.pos[1], 0);
  assert.ok(snapshots[2].player.pos[1] > 0);
  assert.deepEqual(snapshots[0].player.pos, [0, 0, 0]);
});

test('headless sinh cùng ID và JSONL giống hệt nhau với cùng seed', t => {
  const trial = replay(t, { ticks: 1210, cadence: 60 });
  const scenario = join(trial.dir, 'scenario.json');
  writeFileSync(scenario, JSON.stringify({ player: { pos: [0, 0, 22] }, lanterns: [{ id: 'L1', lit: true }] }));
  const args = ['--scenario', scenario];
  let result = trial.run(args);
  assert.equal(result.status, 0, result.stderr);
  const first = trial.output();
  const spawned = first.trim().split('\n').map(JSON.parse).find(row => row.name === 'shade_spawned');
  assert.deepEqual(spawned, { type: 'event', tick: 1200, name: 'shade_spawned', data: { id: 'S4' } });
  result = trial.run(args);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(trial.output(), first);
});

test('headless trả mã 2 và stderr cho nội dung scenario hoặc inputs sai', t => {
  const trial = replay(t);
  const invalid = join(trial.dir, 'invalid.json');
  for (const [kind, content] of [
    ['inputs', '{'],
    ['inputs', JSON.stringify({ frames: [{ tick: 4 }, { tick: 4 }] })],
    ['inputs', JSON.stringify({ frames: [{ tick: 0, move: [0, 2] }] })],
    ['scenario', JSON.stringify({ shades: [{ pos: [0, 1] }] })]
  ]) {
    writeFileSync(invalid, content);
    const result = trial.run(['--' + kind, invalid]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, new RegExp(kind));
    assert.equal(result.stdout, '');
  }
});

test('nhặt đom đóm theo bán kính XZ, giới hạn mang và nạp một lần mỗi lượt nhấn', () => {
  const game = gameFor({
    player: { carried: 6, pos: [0, 4, 0] },
    motes: [[0, 0, 1], [1, 0, 0], [0, 0, -1]],
    lanterns: [{ id: 'L1', pos: [tuning.interact_radius, 0, 0], deposited: 1 }]
  });
  assert.deepEqual(game.step({ ...edgesOff, interact: true }).map(event => event.name),
    ['mote_picked', 'mote_picked', 'deposit', 'lantern_lit']);
  assert.equal(game.player.carried, 5);
  assert.deepEqual(game.step({ ...edgesOff, interact: true }).map(event => event.name), ['mote_picked']);
});

test('pulse trừ đom đóm, đẩy và làm choáng, có cooldown và cần nhấn lại', () => {
  const game = gameFor({ player: { carried: 8 }, shades: [{ pos: [0, .8, 3], id: 'incoming' }] });
  const pulse = { ...edgesOff, pulse: true };
  const events = game.step(pulse);
  assert.deepEqual(events.map(e => e.data), [{ stunned_ids: ['incoming'] }]);
  assert.equal(game.player.carried, 6);
  assert.equal(game.shades[0].state, 'stunned');
  assert.equal(game.shades[0].pos[2], 3 + tuning.pulse_push_m);
  game.step();
  assert.deepEqual(game.step(pulse), []);
  while (game.tick < 181) game.step(pulse);
  assert.equal(game.shades[0].state, 'chase');
  assert.equal(game.player.carried, 6);
  game.step();
  assert.deepEqual(game.step(pulse)[0].data, { stunned_ids: ['incoming'] });
  assert.equal(game.player.carried, 4);
});

test('Bóng Mực tránh vùng đèn, gây rơi đom đóm và không đánh trong thời gian bất tử', () => {
  const safe = gameFor({
    player: { pos: [0, 0, 0] }, lanterns: [{ id: 'L1', lit: true, pos: [0, 0, 0] }],
    shades: [{ pos: [0, 1, 1] }]
  });
  for (let tick = 0; tick < 100; tick++) safe.step();
  assert.equal(safe.player.flames, tuning.flames);
  assert.ok(safe.shades[0].pos[2] > tuning.safe_radius);

  const danger = gameFor({ player: { carried: 5, flames: 2 }, shades: [{ pos: [0, .9, 0] }] });
  assert.deepEqual(danger.step()[0].data, { by: 'shade', flames: 1, dropped: 2 });
  for (let tick = 1; tick < Math.round(tuning.invuln_s * TICK_RATE); tick++) {
    assert.deepEqual(danger.step(), []);
  }
  assert.deepEqual(danger.step().at(-1).data, { result: 'lost', reason: 'no_flames' });
  assert.equal(danger.tick, 1 + tuning.invuln_s * TICK_RATE);
});

test('hết giờ thì thua ở tick tương ứng và dừng mô phỏng', () => {
  const game = gameFor({ time_left_s: 2 / TICK_RATE });
  assert.deepEqual(game.step(), []);
  assert.deepEqual(game.step(), [
    { type: 'event', tick: 2, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }
  ]);
  assert.deepEqual(game.step(), []);
  assert.equal(game.tick, 2);
});
