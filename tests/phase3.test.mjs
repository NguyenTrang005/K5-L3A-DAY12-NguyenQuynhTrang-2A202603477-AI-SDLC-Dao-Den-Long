import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Game } from '../src/game.mjs';
import { trace } from './trace.mjs';

const { tuning } = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
const atHome = [0, 0, 0];
const nearL1 = [0, 0.8, 24];
const shade = (id, pos = nearL1) => ({ id, pos, state: 'drain', target_lantern_id: 'L1' });

test('đèn hao dầu đúng tick, tắt rồi thắp lại; đèn scenario không tăng sức chứa', t => {
  const run = trace(t, { ticks: 67, frames: [{ tick: 6, interact: true }], scenario: {
    player: { carried: 5 },
    lanterns: [{ id: 'L1', lit: true }, { id: 'L2', pos: atHome, lit: true, fuel: .1 }]
  } });
  assert.equal(run.at(0).player.capacity, 10);
  assert.equal(run.at(0).lanterns[0].fuel, 100);
  assert.equal(run.at(5).lanterns[1].lit, true);
  assert.deepEqual(run.at(6).lanterns[1], { id: 'L2', pos: atHome, lit: false, fuel: 0, deposited: 0, ever_lit: true, relit_count: 0 });
  assert.deepEqual(run.events.slice(1), [
    { type: 'event', tick: 6, name: 'lantern_out', data: { lantern_id: 'L2' } },
    { type: 'event', tick: 7, name: 'deposit', data: { lantern_id: 'L2', amount: 5, deposited: 5 } },
    { type: 'event', tick: 7, name: 'lantern_lit', data: { lantern_id: 'L2', relight: true } }
  ]);
  assert.equal(run.at(7).lanterns[1].fuel, 100);
  assert.equal(run.at(7).lanterns[1].relit_count, 1);
  assert.equal(run.at(7).score, 65);
  assert.equal(run.at(7).player.capacity, 12);
  assert.equal(run.at(67).lanterns[1].fuel, 99);
});

test('châm dầu làm tròn số đom đóm cần, kẹp ở 100, và chọn theo ID khi hòa', t => {
  const withFull = new Game(tuning, { scenario: { lanterns: [
    { id: 'L1', pos: [-1, 0, 0], lit: true }, { id: 'L2', pos: [1, 0, 0] }
  ] } });
  assert.equal(withFull.targetLantern().id, 'L2');
  const run = trace(t, { ticks: 2, frames: [{ tick: 0, interact: true }], scenario: {
    player: { carried: 3 },
    lanterns: [{ id: 'L1', pos: [-1, 0, 0], lit: true, fuel: 80 }, { id: 'L2', pos: [1, 0, 0] }]
  } });
  assert.deepEqual(run.events.at(-1), { type: 'event', tick: 1, name: 'refuel', data: { lantern_id: 'L1', amount: 3, fuel: 100 } });
  assert.equal(run.at(1).player.carried, 0);
  assert.equal(run.at(1).player.capacity, 10);
  assert.equal(run.at(1).score, 15);
  assert.equal(run.at(1).lanterns[1].lit, false);
});

test('sức chứa tăng khi thắp ánh sáng, chặn tối đa 20 và áp dụng lúc nhặt', t => {
  const run = trace(t, { ticks: 2, frames: [{ tick: 0, interact: true }], scenario: {
    player: { carried: 19, successful_lights: 5 },
    lanterns: [{ id: 'L1', pos: atHome, ever_lit: true }],
    motes: [atHome, atHome]
  } });
  assert.equal(run.at(0).player.capacity, 20);
  assert.equal(run.at(1).motes_active, 1);
  assert.equal(run.at(1).player.capacity, 20);
  assert.equal(run.at(2).player.carried, 16);
});

test('Bóng Mực đi tới đèn yếu khi wander; hòa chọn ID nhỏ và chase giữ mục tiêu Mây', t => {
  const lanterns = [{ id: 'L1', pos: [5, 0, 0], lit: true, fuel: 29 }, { id: 'L2', pos: [-5, 0, 0], lit: true, fuel: 29 }];
  const actor = { id: 'S1', pos: [0, .8, 0] };
  const seek = trace(t, { ticks: 47, scenario: { player: { pos: [0, 0, -30] }, lanterns, shades: [actor] } });
  assert.ok(seek.at(1).shades[0].pos[0] > 0);
  assert.equal(seek.at(45).shades[0].state, 'drain');
  assert.deepEqual(seek.at(47).shades[0].pos, seek.at(45).shades[0].pos);
  const chase = trace(t, { scenario: { player: { pos: [0, 0, 14] }, lanterns, shades: [{ ...actor, state: 'chase' }] } });
  assert.equal(chase.at(1).shades[0].pos[0], 0);
  assert.ok(chase.at(1).shades[0].pos[2] > 0);
});

test('hai Bóng hút cộng dồn và chỉ báo mỗi 60 tick hút; tạm dừng giữ nguyên dầu', t => {
  const run = trace(t, { ticks: 69, frames: [
    { tick: 4, pause: true }, { tick: 5, pause: false }, { tick: 9, pause: true }, { tick: 10, pause: false }
  ], scenario: { lanterns: [{ id: 'L1', lit: true, fuel: 29 }], shades: [shade('S1'), shade('S2')] } });
  assert.equal(run.at(4).lanterns[0].fuel, run.at(9).lanterns[0].fuel);
  assert.equal(run.at(9).sim_tick, 4);
  assert.equal(run.at(65).lanterns[0].fuel, 18);
  assert.deepEqual(run.events.filter(event => event.name === 'fuel_drain').map(event => [event.tick, event.data]), [
    [65, { lantern_id: 'L1', shade_id: 'S1', fuel: 18 }], [65, { lantern_id: 'L1', shade_id: 'S2', fuel: 18 }]
  ]);
});

test('đúng 30 còn vùng sáng; châm dầu qua ngưỡng buộc Bóng ngừng hút và ra mép', t => {
  const threshold = trace(t, { ticks: 2, scenario: {
    lanterns: [{ id: 'L1', lit: true, fuel: 30 + 1 / 60 }],
    shades: [{ id: 'S1', pos: [0, .8, 22] }]
  } });
  assert.ok(threshold.at(1).shades[0].pos[2] < 22);
  assert.ok(threshold.at(2).shades[0].pos[2] > threshold.at(1).shades[0].pos[2]);
  const restored = trace(t, { ticks: 30, frames: [{ tick: 0, interact: true }], scenario: {
    player: { pos: [0, 0, 25], carried: 1 },
    lanterns: [{ id: 'L1', lit: true, fuel: 26 }],
    shades: [shade('S1')]
  } });
  assert.deepEqual(restored.events.at(-1).data, { lantern_id: 'L1', amount: 1, fuel: 35.9 });
  assert.equal(restored.at(1).shades[0].state, 'wander');
  assert.equal(restored.at(30).player.flames, 3);
  const [x, , z] = restored.at(30).shades[0].pos;
  assert.ok(Math.hypot(x, z - 25) >= 6);
});

test('Tỏa Sáng dừng hút, cộng 15 thay cho 5 và Bóng trở về wander khi hết choáng', t => {
  const run = trace(t, { ticks: 122, frames: [{ tick: 0, pulse: true }], scenario: {
    player: { pos: [0, 0, 22], carried: 3 },
    lanterns: [{ id: 'L1', lit: true, fuel: 29 }],
    shades: [shade('S1'), { id: 'S2', pos: [2, .8, 22] }]
  } });
  assert.deepEqual(run.events.find(event => event.name === 'pulse').data, { stunned_ids: ['S1', 'S2'] });
  assert.equal(run.at(1).score, 20);
  assert.equal(run.at(61).lanterns[0].fuel, 27.9);
  assert.equal(run.at(120).shades[0].state, 'stunned');
  assert.equal(run.at(121).shades[0].state, 'wander');
  const chase = trace(t, { scenario: {
    player: { pos: [0, 0, 18] }, lanterns: [{ id: 'L1', lit: true, fuel: 29 }], shades: [shade('S1')]
  } });
  assert.equal(chase.at(1).shades[0].state, 'chase');
});

test('bình minh yêu cầu lần lượt 3, 4, 5 đèn; không kết thúc sớm và tính điểm theo dầu thô', t => {
  for (const night of [1, 2, 3]) {
    const threshold = night + 2;
    const lit = count => Array.from({ length: count }, (_, index) => ({ id: 'L' + (index + 1), lit: true, fuel: 50 }));
    const scenario = { time_left_s: 2 / 60 };
    const all = trace(t, { night, ticks: 1, scenario: { ...scenario, lanterns: lit(night + 4) } });
    assert.equal(all.end.state, 'playing');
    const won = trace(t, { night, ticks: 4, scenario: { ...scenario, lanterns: lit(threshold) } });
    assert.equal(won.at(2).lanterns[0].fuel, 50);
    assert.equal(won.end.score, threshold * 99 + 150);
    assert.deepEqual(won.events.at(-1).data, { result: 'won', reason: 'dawn_survived' });
    const lost = trace(t, { night, ticks: 4, scenario: { ...scenario, lanterns: lit(threshold - 1) } });
    assert.deepEqual(lost.events.at(-1).data, { result: 'lost', reason: 'dawn' });
  }
});

test('đèn tắt đúng tick bình minh làm thua nếu thiếu ngưỡng; nạp lại cùng tick có thể cứu Đêm', t => {
  const scenario = { time_left_s: 1 / 60, player: { carried: 5 }, lanterns: [
    { id: 'L1', pos: atHome, lit: true, fuel: 1 / 60 },
    { id: 'L2', lit: true, fuel: 50 }, { id: 'L3', lit: true, fuel: 50 }
  ] };
  const lost = trace(t, { scenario });
  assert.deepEqual(lost.events.slice(1).map(event => event.name), ['lantern_out', 'game_over']);
  assert.equal(lost.end.state, 'lost');
  const won = trace(t, { scenario, frames: [{ tick: 0, interact: true }] });
  assert.deepEqual(won.events.slice(1).map(event => event.name), ['lantern_out', 'deposit', 'lantern_lit', 'game_over']);
  assert.equal(won.end.state, 'won');
});
