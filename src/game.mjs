import { blocked, ground, maps } from './maps.mjs';

export const TICK_RATE = 60;
export const DEFAULT_INPUT = Object.freeze({
  move: Object.freeze([0, 0]), cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false
});
const DT = 1 / TICK_RATE;
const GRAVITY = 20;
const EPSILON = 1e-8;
const TAU = Math.PI * 2;
const flatDistance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const within = (a, b, r) => flatDistance(a, b) <= r + EPSILON;
const touches = (a, b, r) => Math.abs(a[1] - b[1]) <= 1.5 + EPSILON && within(a, b, r);
const ticks = seconds => Math.round(seconds * TICK_RATE);
const direction = (from, to) => {
  const distance = flatDistance(from, to);
  return distance > EPSILON ? [(to[0] - from[0]) / distance, (to[2] - from[2]) / distance] : [1, 0];
};
const ascendingId = (a, b) => {
  const first = a.id.match(/^([A-Z]+)(\d+)$/);
  const second = b.id.match(/^([A-Z]+)(\d+)$/);
  if (first && second && first[1] === second[1]) return Number(first[2]) - Number(second[2]);
  return a.id < b.id ? -1 : Number(a.id > b.id);
};

function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function shadeBoundary(a, b, center, radius) {
  const dx = b[0] - a[0], dz = b[2] - a[2];
  const x = a[0] - center[0], z = a[2] - center[2];
  const lengthSq = dx * dx + dz * dz;
  const toward = x * dx + z * dz;
  const gap = x * x + z * z - radius * radius;
  const discriminant = toward * toward - lengthSq * gap;
  if (lengthSq === 0 || toward >= 0 || discriminant <= 0) return 1;
  return Math.min(1, Math.max(0, (-toward - Math.sqrt(discriminant)) / lengthSq));
}

export class Game {
  constructor(tuning, { seed = 1, night = 1, scenario = {} } = {}) {
    this.tuning = tuning;
    this.night = night;
    this.map = maps[night];
    this.random = createRandom(seed);
    this.tick = 0;
    this.simTick = 0;
    this.startTime = scenario.time_left_s ?? tuning['night' + night + '_duration_s'];
    this.timeLeft = this.startTime;
    this.state = 'playing';
    this.score = 0;
    this.events = [];
    this.previousInput = DEFAULT_INPUT;
    this.facing = 0;
    this.verticalSpeed = 0;
    this.launch = null;
    this.dash = null;
    this.respawnAt = 0;
    this.platformEvent = '';
    this.wind = { active: false, dir_deg: 0 };
    this.windWarning = false;
    this.windEnabled = night === 3 && (scenario.wind_enabled ?? true);

    const player = scenario.player ?? {};
    const pos = [...(player.pos ?? this.map.start)];
    this.player = {
      pos, vel: [0, 0, 0], grounded: Math.abs(pos[1] - ground(this.map, pos[0], pos[2])) <= EPSILON,
      flames: player.flames ?? tuning.flames, carried: player.carried ?? 0
    };
    this.hitUntil = player.invuln_ticks ?? 0;
    this.dashUntil = player.dash_cd_ticks ?? 0;
    this.pulseUntil = player.pulse_cd_ticks ?? 0;
    this.charmUntil = player.charm_ticks ?? 0;

    const overrides = new Map((scenario.lanterns ?? []).map(lantern => [lantern.id, lantern]));
    this.lanterns = this.map.lanterns.map((defaultPos, index) => {
      const id = 'L' + (index + 1);
      const override = overrides.get(id);
      const deposited = override?.deposited ?? (override?.lit ? tuning.lantern_cost : 0);
      return { id, pos: [...(override?.pos ?? defaultPos)], lit: override?.lit ?? (deposited >= tuning.lantern_cost), deposited };
    });
    this.randomMotes = scenario.random_motes ?? true;
    this.randomShades = scenario.random_shades ?? true;
    this.randomDrifters = night >= 2 && (scenario.random_drifters ?? true);
    this.motes = [];
    this.shades = [];
    this.drifters = [];
    this.ids = { M: 0, S: 0, D: 0 };
    this.reservedIds = new Set([...(scenario.motes ?? []), ...(scenario.shades ?? []), ...(scenario.drifters ?? [])]
      .map(actor => actor.id).filter(Boolean));
    this.initial = true;
    for (const mote of scenario.motes ?? []) {
      if (Array.isArray(mote)) this.addMote(mote);
      else this.addMote(mote.pos, mote.kind ?? 'random', mote.id, mote.ttl_ticks ?? 480);
    }
    if (scenario.motes === undefined && this.randomMotes) {
      for (let index = 0; index < 20; index++) this.spawnMote();
    }
    for (const shade of scenario.shades ?? []) this.addShade(shade);
    for (const drifter of scenario.drifters ?? []) this.addDrifter(drifter);
    const standardCharms = new Map(this.map.charms.map(charm => [charm.id, charm.pos]));
    this.charms = (scenario.charms ?? this.map.charms).map((charm, index) => {
      const id = charm.id ?? 'C' + (index + 1);
      return {
        id, pos: [...(charm.pos ?? standardCharms.get(id) ?? this.map.start)],
        respawnAt: charm.available === false ? Math.max(1, charm.respawn_ticks ?? 2700) : (charm.respawn_ticks ?? 0)
      };
    });
    this.initial = false;
  }

  nextId(prefix) {
    let id;
    do { id = prefix + ++this.ids[prefix]; } while (this.reservedIds.has(id));
    this.reservedIds.add(id);
    return id;
  }

  choose(points) {
    return points.length ? points[Math.floor(this.random() * points.length)] : undefined;
  }

  addMote(pos, kind = 'random', id, ttl = 480) {
    this.motes.push({
      id: id ?? this.nextId('M'), pos: [...pos], kind,
      expiresAt: kind === 'dropped' ? this.simTick + ttl : Infinity,
      availableAt: this.simTick + Number(!this.initial)
    });
  }

  spawnMote() {
    const pos = this.choose(this.map.motes.filter(point => this.motes.every(mote =>
      flatDistance(point, mote.pos) > EPSILON || Math.abs(point[1] - mote.pos[1]) > EPSILON)));
    if (pos) this.addMote(pos);
  }

  addShade({ pos, id, state = 'wander', state_ticks_left = 0 }) {
    const shade = {
      id: id ?? this.nextId('S'), pos: [...pos], state, until: this.simTick + state_ticks_left,
      push: null, evict: null, wander: this.random() * TAU, previousState: 'wander'
    };
    this.shades.push(shade);
    return shade.id;
  }

  addDrifter({ pos, id, state = 'idle', stolen = 0, state_ticks_left = 240 }) {
    this.drifters.push({
      id: id ?? this.nextId('D'), pos: [...pos], state, stolen,
      until: state === 'flee' ? this.simTick + state_ticks_left : Infinity,
      heading: this.random() * TAU
    });
  }

  emit(name, data) {
    this.events.push({ type: 'event', tick: this.tick, name, data });
  }

  end(result, reason) {
    this.state = result;
    if (result === 'won') {
      const scoring = this.tuning.score;
      this.score += Math.floor(this.timeLeft + EPSILON) * scoring.per_second_left
        + this.player.flames * scoring.per_flame_left;
    }
    this.emit('game_over', { result, reason });
  }

  updateWind() {
    if (!this.windEnabled) return;
    const cycle = this.simTick % 1800;
    if (cycle === 1680) this.wind.dir_deg = this.random() * 360;
    this.windWarning = cycle >= 1680;
    this.wind.active = this.simTick >= 1800 && cycle < 300;
  }

  movement(input) {
    const [x, z] = input.move;
    const theta = (input.cam_yaw_deg % 360) * Math.PI / 180;
    const length = Math.max(Math.hypot(x, z), 1);
    return [(x * Math.cos(theta) + z * Math.sin(theta)) / length, (-x * Math.sin(theta) + z * Math.cos(theta)) / length];
  }

  movePlayer(input, jump, dash) {
    const { player, tuning } = this;
    const pos = player.pos;
    this.platformEvent = '';
    if (this.dash && this.simTick >= this.dash.impactAt) this.dash = null;
    const travel = this.movement(input);
    if (!this.launch && !this.dash && Math.hypot(...travel) > EPSILON) this.facing = Math.atan2(travel[0], travel[1]);

    const charm = this.simTick < this.charmUntil;
    const speed = tuning.player_speed * (charm ? 1.2 : 1);
    let [vx, vz] = this.launch ?? travel.map(value => value * speed);
    if (dash && !this.dash && (charm || this.simTick >= this.dashUntil)) {
      const direction = this.launch ? Math.atan2(vx, vz) : this.facing;
      this.dash = { vx: Math.sin(direction) * tuning.dash_speed, vz: Math.cos(direction) * tuning.dash_speed,
        impactAt: this.simTick + ticks(tuning.dash_duration_s) };
      this.dashUntil = charm ? this.simTick : this.simTick + ticks(tuning.dash_cooldown_s);
      this.emit('dash', {});
    }
    if (this.dash) ({ vx, vz } = this.dash);
    if (this.wind.active) {
      const angle = this.wind.dir_deg * TAU / 360;
      vx += Math.cos(angle) * 2;
      vz += Math.sin(angle) * 2;
    }

    if (jump && player.grounded && !this.dash) {
      this.verticalSpeed = 7;
      player.grounded = false;
      this.platformEvent = 'jump';
    }
    const oldX = pos[0], oldZ = pos[2];
    const nextX = oldX + vx * DT, nextZ = oldZ + vz * DT;
    if (!blocked(this.map, pos, nextX, nextZ, player.grounded)) {
      pos[0] = nextX;
      pos[2] = nextZ;
    }
    let vy = 0;
    const floor = ground(this.map, pos[0], pos[2]);
    if (this.dash) {
      if (player.grounded && floor >= pos[1] - EPSILON) pos[1] = floor;
      player.grounded = Number.isFinite(floor) && Math.abs(pos[1] - floor) <= EPSILON && this.verticalSpeed <= 0;
    } else {
      if (player.grounded && floor >= pos[1] - EPSILON) pos[1] = floor;
      else {
        player.grounded = false;
        pos[1] += this.verticalSpeed * DT - GRAVITY * DT * DT / 2;
        this.verticalSpeed -= GRAVITY * DT;
        if (floor > -Infinity && pos[1] <= floor + EPSILON && this.verticalSpeed <= 0) {
          pos[1] = floor;
          this.verticalSpeed = 0;
          player.grounded = true;
          this.launch = null;
        }
      }
      vy = this.verticalSpeed;
    }

    let padVelocity;
    if (player.grounded && !this.dash) {
      const pad = this.map.pads.find(pad => Math.abs(pad.pos[1] - pos[1]) <= EPSILON && within(pos, pad.pos, 1));
      if (pad) {
        this.launch = direction(pos, pad.target).map(value => value * pad.speed);
        this.facing = Math.atan2(...this.launch);
        this.verticalSpeed = pad.vertical;
        vy = this.verticalSpeed;
        padVelocity = this.launch;
        player.grounded = false;
        this.platformEvent = 'jump';
      }
    }
    player.vel = [padVelocity?.[0] ?? (pos[0] - oldX) / DT, vy, padVelocity?.[1] ?? (pos[2] - oldZ) / DT];
    if (pos[1] < -10) this.fall();
  }

  fall() {
    const lost = this.player.carried;
    this.player.carried = 0;
    this.player.flames--;
    this.player.vel = [0, 0, 0];
    this.dash = null;
    this.launch = null;
    this.verticalSpeed = 0;
    this.respawnAt = this.simTick + 60;
    this.emit('player_hit', { by: 'fall', flames: this.player.flames, dropped: 0, lost });
  }

  respawn() {
    this.player.pos = [...this.map.start];
    this.player.vel = [0, 0, 0];
    this.player.grounded = true;
    this.hitUntil = this.simTick + ticks(this.tuning.invuln_s);
    this.respawnAt = 0;
    this.facing = 0;
  }

  collect() {
    const { player, tuning } = this;
    this.motes = this.motes.filter(mote => {
      if (mote.availableAt > this.simTick || player.carried >= tuning.carry_capacity
        || !touches(player.pos, mote.pos, tuning.pickup_radius)) return true;
      player.carried++;
      this.emit('mote_picked', { carried: player.carried });
      return false;
    });
    for (const charm of this.charms) {
      if (charm.respawnAt > this.simTick || !touches(player.pos, charm.pos, tuning.pickup_radius)) continue;
      this.charmUntil = this.simTick + 600;
      this.dashUntil = this.simTick;
      charm.respawnAt = this.simTick + 2700;
      this.emit('charm_picked', { charm_id: charm.id, charm_ticks: 600 });
    }
  }

  targetLantern() {
    let nearest;
    let shortest = Infinity;
    for (const lantern of this.lanterns) {
      const distance = flatDistance(this.player.pos, lantern.pos);
      if (lantern.lit || distance > this.tuning.interact_radius + EPSILON) continue;
      if (distance < shortest - EPSILON || (Math.abs(distance - shortest) <= EPSILON && ascendingId(lantern, nearest) < 0)) {
        nearest = lantern;
        shortest = distance;
      }
    }
    return nearest;
  }

  deposit() {
    const lantern = this.targetLantern();
    const amount = lantern ? Math.min(this.player.carried, this.tuning.lantern_cost - lantern.deposited) : 0;
    if (amount <= 0) return;
    this.player.carried -= amount;
    lantern.deposited += amount;
    this.score += amount * this.tuning.score.per_mote;
    this.emit('deposit', { lantern_id: lantern.id, amount, deposited: lantern.deposited });
    if (lantern.deposited === this.tuning.lantern_cost) {
      lantern.lit = true;
      this.score += this.tuning.score.per_lantern;
      this.emit('lantern_lit', { lantern_id: lantern.id });
    }
  }

  zones() {
    this.shelters = this.lanterns.filter(lantern => lantern.lit);
    for (const shade of this.shades) {
      if (shade.evict) continue;
      const shelter = this.shelters.find(lantern => flatDistance(shade.pos, lantern.pos) < this.tuning.safe_radius - EPSILON);
      if (!shelter) continue;
      const [dx, dz] = direction(shelter.pos, shade.pos);
      const clearance = this.tuning.safe_radius + 1e-6;
      const targetAt = angle => [
        shelter.pos[0] + Math.cos(angle) * clearance,
        shelter.pos[1], shelter.pos[2] + Math.sin(angle) * clearance
      ];
      const angle = Math.atan2(dz, dx);
      const candidates = [0, 1, -1, 2, -2, 3, -3, 4].map(offset => targetAt(angle + offset * TAU / 8));
      const target = candidates.find(pos => Number.isFinite(ground(this.map, pos[0], pos[2]))
        && this.shelters.every(lantern => flatDistance(pos, lantern.pos) >= this.tuning.safe_radius - EPSILON)) ?? candidates[0];
      shade.evict = { target, remaining: 30 };
    }
  }

  pulse() {
    const { player, tuning } = this;
    if (player.carried < tuning.pulse_cost || this.simTick < this.pulseUntil) return;
    player.carried -= tuning.pulse_cost;
    this.pulseUntil = this.simTick + ticks(tuning.pulse_cooldown_s);
    const [x, y, z] = player.pos;
    const inRange = pos => Math.hypot(pos[0] - x, pos[1] - y - 0.8, pos[2] - z) <= tuning.pulse_radius + EPSILON;
    const stunnedIds = [];
    for (const shade of this.shades) {
      if (!inRange(shade.pos)) continue;
      if (shade.state === 'chase' || shade.state === 'wander') shade.previousState = shade.state;
      shade.state = 'stunned';
      shade.until = this.simTick + ticks(tuning.pulse_stun_s);
      shade.push = { dir: direction(player.pos, shade.pos), step: tuning.pulse_push_m / 15, end: this.simTick + 15 };
      stunnedIds.push(shade.id);
    }
    this.score += stunnedIds.length * tuning.score.per_stun;
    this.emit('pulse', { stunned_ids: stunnedIds });
    for (const drifter of this.drifters) {
      if (!inRange(drifter.pos)) continue;
      if (drifter.state === 'chase') this.flee(drifter, 240);
      else if (drifter.state === 'flee' && drifter.stolen > 0) {
        const amount = drifter.stolen;
        drifter.stolen = 0;
        for (let index = 0; index < amount; index++) {
          const [mx, my, mz] = drifter.pos;
          const floor = ground(this.map, mx, mz);
          this.addMote([mx, Number.isFinite(floor) ? floor : my, mz], 'dropped');
        }
        drifter.until = this.simTick + 120;
        this.emit('drifter_drop', { drifter_id: drifter.id, amount });
      }
    }
  }

  moveShade(shade, dir, length) {
    const from = shade.pos;
    const at = [from[0] + dir[0] * length, from[1], from[2] + dir[1] * length];
    const current = ground(this.map, from[0], from[2]);
    const floor = ground(this.map, at[0], at[2]);
    if (!Number.isFinite(floor) || blocked(this.map, [from[0], Math.min(from[1], current), from[2]], at[0], at[2], true)) return false;
    let fraction = 1;
    for (const lantern of this.shelters) fraction = Math.min(fraction, shadeBoundary(from, at, lantern.pos, this.tuning.safe_radius));
    from[0] += (at[0] - from[0]) * fraction;
    from[2] += (at[2] - from[2]) * fraction;
    if (Number.isFinite(current)) from[1] += ground(this.map, from[0], from[2]) - current;
    return fraction === 1;
  }

  updateShades(canTarget) {
    const speed = this.night === 3 ? 4.5 : this.tuning.shade_speed;
    for (const shade of this.shades) {
      shade.evictedThisTick = Boolean(shade.evict);
      if (shade.until <= this.simTick && ['spawning', 'recoil', 'stunned'].includes(shade.state)) {
        shade.state = shade.previousState;
        shade.push = null;
      }
      if (shade.evict) {
        const { target, remaining } = shade.evict;
        shade.pos[0] += (target[0] - shade.pos[0]) / remaining;
        shade.pos[2] += (target[2] - shade.pos[2]) / remaining;
        if (--shade.evict.remaining === 0) shade.evict = null;
        continue;
      }
      if (shade.state === 'spawning') continue;
      if (shade.state === 'recoil' || shade.state === 'stunned') {
        if (shade.push && this.simTick < shade.push.end && !this.moveShade(shade, shade.push.dir, shade.push.step)) shade.push = null;
        continue;
      }
      const distance = flatDistance(shade.pos, this.player.pos);
      if (!canTarget || distance > 18 + EPSILON) shade.state = 'wander';
      else if (distance <= 12 + EPSILON) shade.state = 'chase';
      if (shade.state === 'chase') {
        if (distance > EPSILON) this.moveShade(shade, direction(shade.pos, this.player.pos), Math.min(distance, speed * DT));
      } else {
        const moved = this.moveShade(shade, [Math.cos(shade.wander), Math.sin(shade.wander)], speed * 0.4 * DT);
        if (!moved || this.simTick % 180 === 0) shade.wander = this.random() * TAU;
      }
    }
  }

  flee(drifter, duration) {
    drifter.state = 'flee';
    drifter.until = this.simTick + duration;
    const [x, z] = direction(this.player.pos, drifter.pos);
    drifter.heading = Math.atan2(z, x);
  }

  updateDrifters(canTarget) {
    for (const drifter of this.drifters) {
      if (this.simTick >= drifter.until) drifter.state = 'removed';
      if (drifter.state === 'removed') continue;
      let speed = 7;
      if (drifter.state !== 'flee') {
        const chase = canTarget && this.player.carried >= 5 && within(drifter.pos, this.player.pos, 15);
        drifter.state = chase ? 'chase' : 'idle';
        if (chase) {
          const distance = flatDistance(drifter.pos, this.player.pos);
          const [x, z] = direction(drifter.pos, this.player.pos);
          drifter.heading = Math.atan2(z, x);
          speed = Math.min(speed, distance / DT);
        } else {
          speed = 2;
          drifter.heading += DT * 0.55;
        }
      }
      drifter.pos[0] += Math.cos(drifter.heading) * speed * DT;
      drifter.pos[2] += Math.sin(drifter.heading) * speed * DT;
    }
    this.drifters = this.drifters.filter(drifter => drifter.state !== 'removed');
  }

  contact() {
    for (const drifter of [...this.drifters].sort(ascendingId)) {
      if (drifter.state === 'flee' || this.player.carried === 0 || !within(drifter.pos, this.player.pos, 1.2)) continue;
      const amount = Math.min(3, this.player.carried);
      this.player.carried -= amount;
      drifter.stolen = amount;
      this.flee(drifter, 240);
      this.emit('drifter_steal', { drifter_id: drifter.id, amount, carried: this.player.carried });
    }
    if (this.simTick < this.hitUntil || this.shelters.some(lantern => within(this.player.pos, lantern.pos, this.tuning.safe_radius))) return;
    const shade = [...this.shades].sort(ascendingId).find(shade => ['chase', 'wander'].includes(shade.state) && !shade.evictedThisTick
      && touches(shade.pos, this.player.pos, this.tuning.shade_hit_radius));
    if (shade) this.hit(shade);
  }

  hit(shade) {
    const { player, tuning } = this;
    player.flames--;
    this.hitUntil = this.simTick + ticks(tuning.invuln_s);
    const dropped = Math.floor(player.carried * tuning.hit_drop_ratio);
    player.carried -= dropped;
    const initialAngle = this.random() * TAU;
    for (let index = 0; index < dropped; index++) {
      const angle = initialAngle + TAU * index / dropped;
      const radius = 1.5 + this.random();
      const x = player.pos[0] + Math.cos(angle) * radius;
      const z = player.pos[2] + Math.sin(angle) * radius;
      const floor = ground(this.map, x, z);
      this.addMote([x, Number.isFinite(floor) ? floor : player.pos[1], z], 'dropped');
    }
    shade.previousState = shade.state;
    shade.state = 'recoil';
    shade.until = this.simTick + 60;
    shade.push = { dir: direction(player.pos, shade.pos), step: 2 / 60, end: shade.until };
    if (!this.moveShade(shade, shade.push.dir, shade.push.step)) shade.push = null;
    this.emit('player_hit', { by: 'shade', flames: player.flames, dropped });
  }

  spawn() {
    if (this.randomMotes && this.simTick % 240 === 0 && this.motes.length < 30) this.spawnMote();
    const shadeTime = this.simTick - 300;
    if (this.randomShades && shadeTime >= 0 && shadeTime % this.map.shadeInterval === 0) {
      const batch = shadeTime === 0 ? 2 : 1;
      for (let index = 0; index < batch && this.shades.length < this.map.shadeCap; index++) {
        const point = this.choose(this.map.fog.filter(point => flatDistance(point, this.player.pos) >= 15 - EPSILON
          && this.shades.every(shade => flatDistance(point, shade.pos) > 1)));
        if (!point) break;
        const id = this.addShade({ pos: [point[0], point[1] + 0.8, point[2]], state: 'spawning', state_ticks_left: 30 });
        this.emit('shade_spawned', { id });
      }
    }
    if (this.randomDrifters && this.simTick % 1200 === 0 && this.drifters.length < 2) {
      const point = this.choose(this.map.fog);
      this.addDrifter({ pos: [point[0], point[1] + 0.8, point[2]] });
    }
  }

  step(input = DEFAULT_INPUT) {
    if (this.state === 'won' || this.state === 'lost') return [];
    this.events = [];
    this.tick++;
    const previous = this.previousInput;
    this.previousInput = input;
    const pressed = key => input[key] && !previous[key];
    if (pressed('pause')) {
      this.state = this.state === 'paused' ? 'playing' : 'paused';
      this.emit(this.state === 'paused' ? 'paused' : 'resumed', {});
    }
    if (this.state === 'paused') return this.events;

    this.simTick++;
    this.timeLeft = Math.max(0, this.startTime - this.simTick / TICK_RATE);
    this.motes = this.motes.filter(mote => mote.expiresAt > this.simTick);
    this.updateWind();
    if (this.respawnAt === this.simTick) this.respawn();
    else if (!this.respawnAt && this.player.flames > 0) this.movePlayer(input, pressed('jump'), pressed('dash'));
    const canAct = !this.respawnAt && this.player.flames > 0;
    if (canAct) {
      this.collect();
      if (pressed('interact')) this.deposit();
    }
    this.zones();
    if (canAct && pressed('pulse')) this.pulse();
    this.updateShades(canAct);
    this.updateDrifters(canAct);
    if (canAct) this.contact();
    this.spawn();
    if (this.player.flames <= 0) this.end('lost', 'no_flames');
    else if (this.lanterns.every(lantern => lantern.lit)) this.end('won', 'all_lit');
    else if (this.timeLeft === 0) this.end('lost', 'dawn');
    return this.events;
  }

  snapshot() {
    const rounded = pos => pos.map(value => Number(value.toFixed(3)));
    const remaining = end => Math.max(0, end - this.simTick) / TICK_RATE;
    return {
      type: 'snapshot', tick: this.tick, sim_tick: this.simTick, state: this.state, night: this.night,
      wind: { ...this.wind }, time_left_s: this.timeLeft, score: this.score,
      player: { ...this.player, pos: rounded(this.player.pos), vel: rounded(this.player.vel),
        invuln: this.simTick < this.hitUntil, dash_cd_s: remaining(this.dashUntil),
        pulse_cd_s: remaining(this.pulseUntil), charm_s: remaining(this.charmUntil) },
      lanterns: this.lanterns.map(lantern => ({ ...lantern, pos: rounded(lantern.pos) })),
      shades: this.shades.map(({ id, pos, state }) => ({ id, pos: rounded(pos), state })),
      motes_active: this.motes.length,
      motes: this.motes.map(({ id, pos, kind, expiresAt }) => ({ id, pos: rounded(pos), kind,
        ttl_s: kind === 'dropped' ? remaining(expiresAt) : null })),
      drifters: this.drifters.map(({ id, pos, state, stolen }) => ({ id, pos: rounded(pos), state, stolen })),
      charms: this.charms.map(({ id, respawnAt }) => ({ id, available: this.simTick >= respawnAt,
        respawn_s: remaining(respawnAt) }))
    };
  }
}
