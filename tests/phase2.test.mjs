import assert from 'node:assert/strict';
import test from 'node:test';
import { trace } from './trace.mjs';

test('hồi quy v1.2: ba Đêm giữ layout, mảng snapshot và 20 đom đóm chuẩn', t => {
  const expected = [
    [240, 5, [0, 0, 25], 23, 24],
    [270, 6, [0, 0, 20], 23, 24],
    [300, 7, [0, 6, 6], 23, 30]
  ];
  for (const [index, [duration, lamps, first, motes, maximum]] of expected.entries()) {
    const night = index + 1;
    const run = trace(t, { night, ticks: 2400, cadence: 240, scenario: { random_motes: true } });
    const start = run.at(0);
    assert.equal(start.night, night);
    assert.equal(start.time_left_s, duration);
    assert.equal(start.lanterns.length, lamps);
    assert.deepEqual(start.lanterns[0].pos, first);
    assert.equal(start.motes.length, 20);
    assert.equal(new Set(start.motes.map(mote => mote.pos.join(','))).size, 20);
    assert.ok(start.motes.every(mote => mote.kind === 'random' && mote.ttl_s === null));
    assert.deepEqual(start.drifters, []);
    assert.equal(start.charms.length, index);
    assert.equal(run.at(720).motes.length, motes);
    assert.equal(run.at(2400).motes.length, maximum);
    assert.deepEqual(run.events[0], { type: 'event', tick: 0, name: 'night_start', data: { night } });
  }
});

test('lướt đúng 12 tick từ hướng đang nhìn, giữ Y khi đang nhảy và cần hồi chiêu', t => {
  const run = trace(t, { ticks: 115, frames: [
    { tick: 0, jump: true },
    { tick: 1, jump: false, dash: true },
    { tick: 2, dash: false },
    { tick: 13, dash: true },
    { tick: 14, dash: false },
    { tick: 91, dash: true }
  ] });
  assert.deepEqual(run.events.filter(event => event.name === 'dash').map(event => event.tick), [2, 92]);
  assert.equal(run.at(2).player.vel[2], 14);
  assert.equal(run.at(2).player.dash_cd_s, 1.5);
  assert.equal(run.at(13).player.pos[2], 2.8);
  assert.equal(run.at(13).player.pos[1], run.at(1).player.pos[1]);
  assert.equal(run.at(13).player.vel[1], 0);
  assert.ok(run.at(14).player.pos[1] > run.at(13).player.pos[1]);
  assert.equal(run.at(14).player.vel[2], 0);
});

test('pause giữ nguyên sim_tick, thời gian, cooldown, TTL, bùa và lịch sinh', t => {
  const run = trace(t, { night: 2, ticks: 245, frames: [
    { tick: 0, dash: true },
    { tick: 1, dash: false, pause: true },
    { tick: 2, pause: false },
    { tick: 6, pause: true },
    { tick: 7, pause: false }
  ], scenario: {
    player: { charm_ticks: 100, invuln_ticks: 90, pulse_cd_ticks: 40 },
    motes: [{ pos: [8, 0, 8], kind: 'dropped', ttl_ticks: 90 }],
    random_motes: true
  } });
  const before = run.at(1);
  assert.equal(run.at(2).state, 'paused');
  for (const tick of [2, 3, 4, 5, 6]) {
    const snap = run.at(tick);
    assert.deepEqual({ ...snap, tick: 1, state: 'playing' }, before);
  }
  assert.equal(run.at(7).sim_tick, 2);
  assert.equal(run.at(244).motes.length, 0);
  assert.equal(run.at(245).sim_tick, 240);
  assert.equal(run.at(245).motes.length, 1);
  assert.deepEqual(run.events.filter(event => ['paused', 'resumed'].includes(event.name)).map(event => [event.name, event.tick]),
    [['paused', 2], ['resumed', 7]]);
});

test('ngã bỏ qua bất tử, mất toàn bộ đồ một lần và hồi sinh sau 60 tick', t => {
  const run = trace(t, { ticks: 65, scenario: { player: { pos: [41, -10.1, 0], carried: 9, flames: 2, invuln_ticks: 100 } } });
  assert.deepEqual(run.events.filter(event => event.name === 'player_hit'),
    [{ type: 'event', tick: 1, name: 'player_hit', data: { by: 'fall', flames: 1, dropped: 0, lost: 9 } }]);
  assert.equal(run.at(60).player.carried, 0);
  assert.ok(run.at(60).player.pos[1] < -10);
  assert.deepEqual(run.at(61).player.pos, [0, 0, 0]);
  assert.deepEqual(run.at(61).player.vel, [0, 0, 0]);
  assert.equal(run.at(61).player.invuln, true);
  assert.equal(run.at(61).player.grounded, true);
});

test('thứ tự kết quả ưu tiên hết lửa; tại bình minh dùng ngưỡng đèn; đèn hòa chọn ID nhỏ', t => {
  const lanterns = [{ id: 'L1', pos: [-1, 0, 0], deposited: 8 }, { id: 'L2', pos: [1, 0, 0], deposited: 8 }];
  const tie = trace(t, { ticks: 1, frames: [{ tick: 0, interact: true }], scenario: { lanterns, player: { carried: 2 } } });
  assert.deepEqual(tie.events.find(event => event.name === 'deposit').data, { lantern_id: 'L1', amount: 2, deposited: 10 });
  const lit = [1, 2, 3, 4, 5].map(index => ({ id: 'L' + index, lit: true }));
  const lose = trace(t, { ticks: 1, scenario: { lanterns: lit, player: { flames: 1, pos: [41, -11, 0] }, time_left_s: 0 } });
  assert.deepEqual(lose.events.at(-1).data, { result: 'lost', reason: 'no_flames' });
  const win = trace(t, { ticks: 1, frames: [{ tick: 0, interact: true }],
    scenario: { lanterns: [lanterns[0], ...lit.slice(1)], player: { carried: 2 }, time_left_s: 1 / 60 } });
  assert.deepEqual(win.events.at(-1).data, { result: 'won', reason: 'dawn_survived' });
  assert.equal(win.end.score, 1006);
});

test('Đảo Cau: đi qua cầu và bị khóa hướng khi được bục phóng sang đảo đối diện', t => {
  const bridge = trace(t, { night: 2, ticks: 210, frames: [{ tick: 0, move: [1, 0] }], scenario: { player: { pos: [25, 0, 0] } } });
  assert.equal(bridge.at(100).player.grounded, true);
  assert.deepEqual(bridge.at(210).player.pos, [48.4, 0, 0]);
  assert.deepEqual(bridge.events.find(event => event.name === 'charm_picked').data, { charm_id: 'C1', charm_ticks: 600 });
  const pad = trace(t, { night: 2, ticks: 85, frames: [{ tick: 1, move: [-1, 0] }], scenario: { player: { pos: [20, 0, 18] } } });
  assert.equal(pad.at(1).player.vel[1], 14);
  assert.ok(Math.abs(Math.hypot(pad.at(1).player.vel[0], pad.at(1).player.vel[2]) - 24) < .001);
  assert.ok(pad.at(42).player.pos[1] > 4.7);
  assert.ok(pad.at(85).player.pos[0] > 50);
  assert.equal(pad.at(85).player.grounded, true);
});

test('Đảo Chuông: dốc lên tầng 1, vách chặn, bục lên tầng 2, tháp cản đường', t => {
  const angle = Math.PI / 6;
  const dx = Math.cos(angle), dz = Math.sin(angle);
  const ramp = trace(t, { night: 3, ticks: 75, frames: [{ tick: 0, move: [-dx, -dz] }],
    scenario: { player: { pos: [31 * dx, 0, 31 * dz] } } });
  assert.equal(ramp.at(40).player.pos[1], 1.5);
  assert.equal(ramp.at(75).player.pos[1], 3);
  const wall = trace(t, { night: 3, ticks: 30, frames: [{ tick: 0, move: [0, -1] }], scenario: { player: { pos: [0, 0, 25] } } });
  assert.equal(wall.at(30).player.pos[1], 0);
  assert.ok(wall.at(30).player.pos[2] > 24);
  const pad = trace(t, { night: 3, ticks: 110, frames: [{ tick: 53, move: [0, -1] }], scenario: { player: { pos: [0, 3, 13] } } });
  assert.equal(pad.at(1).player.vel[1], 12);
  assert.equal(pad.at(53).player.pos[1], 6);
  assert.ok(pad.at(110).player.pos[2] >= 2);
  assert.ok(pad.at(110).player.pos[2] < 2.1);
});

test('Gió Lạc sinh đúng lịch và biến mất khi hết thời gian chạy trốn', t => {
  const spawn = trace(t, { night: 2, ticks: 3600, cadence: 1200, scenario: { random_drifters: true } });
  assert.equal(spawn.at(1200).drifters[0].id, 'D1');
  assert.deepEqual(spawn.at(3600).drifters.map(drifter => drifter.id), ['D1', 'D2']);
  const flee = trace(t, { night: 3, ticks: 241, scenario: { player: { pos: [0, 0, -10], carried: 6 },
    drifters: [{ pos: [0, 0, -9], id: 'D1' }] } });
  assert.equal(flee.at(1).drifters[0].stolen, 3);
  assert.equal(flee.at(240).drifters[0].state, 'flee');
  assert.deepEqual(flee.at(241).drifters, []);
});

test('Gió Lạc cướp trước hit, có thể lấy lại đom đóm bằng pulse, và sợ pulse khi chase', t => {
  const near = { night: 2, ticks: 122, frames: [{ tick: 1, pulse: true }],
    scenario: { player: { carried: 10 }, drifters: [{ id: 'D1', pos: [0, .8, 1] }], shades: [{ pos: [0, .8, 1] }] } };
  const run = trace(t, near);
  assert.deepEqual(run.events.filter(event => event.tick === 1).map(event => [event.name, event.data]),
    [['drifter_steal', { drifter_id: 'D1', amount: 3, carried: 7 }], ['player_hit', { by: 'shade', flames: 2, dropped: 3 }]]);
  assert.deepEqual(run.events.find(event => event.name === 'drifter_drop').data, { drifter_id: 'D1', amount: 3 });
  assert.equal(run.at(2).drifters[0].stolen, 0);
  assert.equal(run.at(2).motes.filter(mote => mote.kind === 'dropped').length, 6);
  assert.deepEqual(run.at(122).drifters, []);
  const repel = trace(t, { night: 2, ticks: 2, frames: [{ tick: 0, pulse: true }], scenario: {
    player: { carried: 10, invuln_ticks: 90 }, drifters: [{ id: 'D1', pos: [1, 0, 0], state: 'chase' }]
  } });
  assert.equal(repel.at(1).drifters[0].state, 'flee');
  assert.equal(repel.at(1).drifters[0].stolen, 0);
});

test('Bùa Gió tăng tốc, bỏ cooldown lướt, hết hiệu lực và hiện lại đúng tick', t => {
  const run = trace(t, { night: 2, ticks: 2702, frames: [
    { tick: 1, move: [1, 0] }, { tick: 2, dash: true }, { tick: 3, dash: false },
    { tick: 7, dash: true }, { tick: 8, dash: false }, { tick: 14, dash: true },
    { tick: 15, dash: false }, { tick: 30, move: [0, 0] }
  ], scenario: { charms: [{ id: 'C1', pos: [0, 0, 0] }] } });
  assert.deepEqual(run.events.find(event => event.name === 'charm_picked').data, { charm_id: 'C1', charm_ticks: 600 });
  assert.equal(run.at(1).player.charm_s, 10);
  assert.equal(run.at(2).player.vel[0], 7.2);
  assert.equal(run.at(3).player.dash_cd_s, 0);
  assert.deepEqual(run.events.filter(event => event.name === 'dash').map(event => event.tick), [3, 15]);
  assert.equal(run.at(601).player.charm_s, 0);
  assert.equal(run.at(2700).charms[0].available, false);
  assert.equal(run.at(2701).charms[0].available, true);
});

test('gió mạnh theo sim_tick, cảnh báo giữ hướng và sức đẩy đúng 2 m/s', t => {
  const run = trace(t, { night: 3, ticks: 2100, scenario: { wind_enabled: true } });
  assert.equal(run.at(1679).wind.dir_deg, 0);
  assert.equal(run.at(1680).wind.active, false);
  assert.equal(run.at(1680).wind.dir_deg, run.at(1800).wind.dir_deg);
  const [x, , z] = run.at(1800).player.vel;
  assert.ok(Math.abs(Math.hypot(x, z) - 2) < .001);
  assert.equal(run.at(1799).wind.active, false);
  assert.equal(run.at(1800).wind.active, true);
  assert.equal(run.at(2099).wind.active, true);
  assert.equal(run.at(2100).wind.active, false);
});

test('Tỏa Sáng dùng khoảng cách 3D và dừng đẩy ở vách tháp', t => {
  const run = trace(t, { night: 3, ticks: 122, frames: [{ tick: 0, pulse: true }], scenario: {
    player: { pos: [6, 6, 0], carried: 3 },
    shades: [{ id: 'S1', pos: [2.2, 6.8, 0] }, { id: 'S2', pos: [6, 12, 0] }]
  } });
  assert.deepEqual(run.events.find(event => event.name === 'pulse').data, { stunned_ids: ['S1'] });
  assert.deepEqual(run.at(15).shades[0].pos, [2.2, 6.8, 0]);
  assert.equal(run.at(120).shades[0].state, 'stunned');
  assert.notEqual(run.at(121).shades[0].state, 'stunned');
  assert.equal(run.at(1).score, 5);
});
