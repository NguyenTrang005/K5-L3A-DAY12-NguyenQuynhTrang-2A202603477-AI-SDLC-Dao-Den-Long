export const TICK_RATE = 60;
export const ISLAND_RADIUS = 36;
export const DEFAULT_INPUT = Object.freeze({
  move: Object.freeze([0, 0]), cam_yaw_deg: 0, jump: false, interact: false, pulse: false
});

const LANTERN_POSITIONS = [[0, 0, 22], [21, 0, 8], [13, 0, -19], [-13, 0, -19], [-21, 0, 8]];
const GRAVITY = 24;
const JUMP_SPEED = 8;
const MOTES_INITIAL = 48;
const SHADE_HEIGHT = 0.85;
const MOTE_INTERVAL = 5 * TICK_RATE;
const SHADE_INTERVAL = 20 * TICK_RATE;
const EPSILON = 1e-9;

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function within(a, b, radius) {
  return distance(a, b) <= radius + EPSILON;
}

function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export class Game {
  constructor(tuning, { seed = 1, scenario = {} } = {}) {
    this.tuning = tuning;
    this.random = createRandom(seed);
    this.tick = 0;
    this.startTime = scenario.time_left_s ?? tuning.night1_duration_s;
    this.timeLeft = this.startTime;
    this.state = 'playing';
    this.score = 0;
    this.events = [];
    this.previousInput = DEFAULT_INPUT;
    this.verticalSpeed = 0;
    this.facing = 0;
    this.hitUntil = 0;
    this.pulseUntil = 0;
    this.player = {
      pos: [...(scenario.player?.pos ?? [0, 0, 0])],
      flames: scenario.player?.flames ?? tuning.flames,
      carried: scenario.player?.carried ?? 0
    };

    const overrides = new Map((scenario.lanterns ?? []).map(lantern => [lantern.id, lantern]));
    this.lanterns = LANTERN_POSITIONS.slice(0, tuning.lantern_count_night1).map((pos, index) => {
      const id = 'L' + (index + 1);
      const override = overrides.get(id);
      const deposited = override?.deposited ?? (override?.lit ? tuning.lantern_cost : 0);
      return { id, pos: [...(override?.pos ?? pos)], lit: override?.lit ?? (deposited >= tuning.lantern_cost), deposited };
    });

    this.randomMotes = scenario.random_motes ?? true;
    this.randomShades = scenario.random_shades ?? true;
    this.motes = [];
    for (const pos of scenario.motes ?? []) this.addMote(pos);
    if (scenario.motes === undefined && this.randomMotes) {
      for (let index = 0; index < MOTES_INITIAL; index++) {
        const angle = index * 2.399963 + this.random() * 0.35;
        const radius = 4 + 27 * Math.sqrt(index / MOTES_INITIAL);
        this.addMote([Math.sin(angle) * radius, 0, Math.cos(angle) * radius]);
      }
    }

    this.shades = [];
    this.shadeSequence = 0;
    this.shadeIds = new Set((scenario.shades ?? []).map(shade => shade.id).filter(Boolean));
    if (scenario.shades !== undefined) {
      for (const shade of scenario.shades) this.addShade(shade.pos, shade.id);
    } else if (this.randomShades) {
      for (const angle of [0.7, 2.8, 4.9]) this.addShade(this.spawnPosition(angle, 30, SHADE_HEIGHT));
    }
  }

  spawnPosition(angle, radius, y) {
    return [Math.sin(angle) * radius, y, Math.cos(angle) * radius];
  }

  addMote(pos) {
    this.motes.push({ pos: [...pos] });
  }

  addShade(pos, id) {
    if (!id) {
      do {
        id = 'S' + ++this.shadeSequence;
      } while (this.shadeIds.has(id));
    }
    this.shadeIds.add(id);
    this.shades.push({ id, pos: [...pos], state: 'chase', stunnedUntil: 0 });
    return id;
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

  movePlayer(input, jump) {
    const pos = this.player.pos;
    const [x, z] = input.move;
    const theta = (input.cam_yaw_deg % 360) * Math.PI / 180;
    const length = Math.max(Math.hypot(x, z), 1);
    const dx = (x * Math.cos(theta) + z * Math.sin(theta)) / length;
    const dz = (-x * Math.sin(theta) + z * Math.cos(theta)) / length;
    if (x || z) {
      this.facing = Math.atan2(dx, dz);
      const nextX = pos[0] + dx * this.tuning.player_speed / TICK_RATE;
      const nextZ = pos[2] + dz * this.tuning.player_speed / TICK_RATE;
      if (Math.hypot(nextX, nextZ) <= ISLAND_RADIUS || Math.hypot(nextX, nextZ) < Math.hypot(pos[0], pos[2])) {
        pos[0] = nextX;
        pos[2] = nextZ;
      }
    }
    if (jump && pos[1] === 0) this.verticalSpeed = JUMP_SPEED;
    if (pos[1] > 0 || this.verticalSpeed > 0) {
      pos[1] = Math.max(0, pos[1] + this.verticalSpeed / TICK_RATE);
      this.verticalSpeed = pos[1] === 0 ? 0 : this.verticalSpeed - GRAVITY / TICK_RATE;
    }
  }

  collect() {
    const { player, tuning } = this;
    this.motes = this.motes.filter(mote => {
      if (player.carried >= tuning.carry_capacity || !within(player.pos, mote.pos, tuning.pickup_radius)) return true;
      player.carried++;
      this.score += tuning.score.per_mote;
      this.emit('mote_picked', { carried: player.carried });
      return false;
    });
  }

  targetLantern() {
    let nearest;
    let nearestDistance = Infinity;
    for (const lantern of this.lanterns) {
      const gap = distance(this.player.pos, lantern.pos);
      if (!lantern.lit && gap <= this.tuning.interact_radius + EPSILON && gap < nearestDistance) {
        nearest = lantern;
        nearestDistance = gap;
      }
    }
    return nearest;
  }

  deposit() {
    const lantern = this.targetLantern();
    if (!lantern || this.player.carried === 0) return;
    const amount = Math.min(this.player.carried, this.tuning.lantern_cost - lantern.deposited);
    if (amount <= 0) return;
    this.player.carried -= amount;
    lantern.deposited += amount;
    this.emit('deposit', { lantern_id: lantern.id, amount, deposited: lantern.deposited });
    if (lantern.deposited >= this.tuning.lantern_cost) {
      lantern.lit = true;
      this.score += this.tuning.score.per_lantern;
      this.emit('lantern_lit', { lantern_id: lantern.id });
    }
  }

  pulse() {
    const { player, tuning } = this;
    if (player.carried < tuning.pulse_cost || this.tick < this.pulseUntil) return;
    player.carried -= tuning.pulse_cost;
    this.pulseUntil = this.tick + Math.round(tuning.pulse_cooldown_s * TICK_RATE);
    const stunnedIds = [];
    for (const shade of this.shades) {
      if (!within(shade.pos, player.pos, tuning.pulse_radius)) continue;
      const gap = distance(shade.pos, player.pos);
      shade.pos[0] += tuning.pulse_push_m * (gap ? (shade.pos[0] - player.pos[0]) / gap : 1);
      shade.pos[2] += tuning.pulse_push_m * (gap ? (shade.pos[2] - player.pos[2]) / gap : 0);
      shade.state = 'stunned';
      shade.stunnedUntil = this.tick + Math.round(tuning.pulse_stun_s * TICK_RATE);
      stunnedIds.push(shade.id);
    }
    this.score += stunnedIds.length * tuning.score.per_stun;
    this.emit('pulse', { stunned_ids: stunnedIds });
  }

  isSafe(pos) {
    return this.lanterns.some(lantern => lantern.lit && within(pos, lantern.pos, this.tuning.safe_radius));
  }

  updateShades() {
    const { player, tuning } = this;
    const playerIsSafe = this.isSafe(player.pos);
    for (const shade of this.shades) {
      if (this.tick < shade.stunnedUntil) continue;
      shade.state = 'chase';
      const shelter = this.lanterns.find(lantern => lantern.lit && within(shade.pos, lantern.pos, tuning.safe_radius));
      const target = shelter ? shelter.pos : player.pos;
      const gap = distance(shade.pos, target);
      if (shelter || !playerIsSafe) {
        const direction = shelter ? -1 : 1;
        const travel = Math.min(gap || Infinity, tuning.shade_speed / TICK_RATE);
        const next = [...shade.pos];
        next[0] += gap ? (target[0] - next[0]) / gap * travel * direction : (shelter ? travel : 0);
        next[2] += gap ? (target[2] - next[2]) / gap * travel * direction : 0;
        if (shelter || !this.isSafe(next)) shade.pos = next;
      }
      if (!playerIsSafe && this.tick >= this.hitUntil && within(shade.pos, player.pos, tuning.shade_hit_radius)) {
        this.hit();
        if (player.flames === 0) return;
      }
    }
  }

  hit() {
    const { player, tuning } = this;
    player.flames--;
    this.hitUntil = this.tick + Math.round(tuning.invuln_s * TICK_RATE);
    const dropped = Math.floor(player.carried * tuning.hit_drop_ratio);
    player.carried -= dropped;
    for (let index = 0; index < dropped; index++) {
      const angle = 2 * Math.PI * index / dropped;
      const radius = tuning.pickup_radius + 0.85;
      let x = player.pos[0] + Math.sin(angle) * radius;
      let z = player.pos[2] + Math.cos(angle) * radius;
      const length = Math.hypot(x, z);
      if (length > ISLAND_RADIUS - 0.5) {
        x *= (ISLAND_RADIUS - 0.5) / length;
        z *= (ISLAND_RADIUS - 0.5) / length;
      }
      this.addMote([x, 0, z]);
    }
    this.emit('player_hit', { by: 'shade', flames: player.flames, dropped });
  }

  spawn() {
    if (this.randomMotes && this.tick % MOTE_INTERVAL === 0 && this.motes.length < MOTES_INITIAL) {
      for (let index = 0; index < 3 && this.motes.length < MOTES_INITIAL; index++) {
        this.addMote(this.spawnPosition(this.random() * Math.PI * 2, 4 + this.random() * 28, 0));
      }
    }
    if (this.randomShades && this.tick % SHADE_INTERVAL === 0 && this.shades.length < 8) {
      const pos = this.spawnPosition(this.random() * Math.PI * 2, 33, SHADE_HEIGHT);
      this.emit('shade_spawned', { id: this.addShade(pos) });
    }
  }

  step(input = DEFAULT_INPUT) {
    if (this.state !== 'playing') return [];
    this.events = [];
    this.tick++;
    this.timeLeft = Math.max(0, this.startTime - this.tick / TICK_RATE);
    const pressed = key => input[key] && !this.previousInput[key];
    this.movePlayer(input, pressed('jump'));
    this.collect();
    if (pressed('interact')) this.deposit();
    if (pressed('pulse')) this.pulse();
    this.previousInput = input;

    if (this.lanterns.every(lantern => lantern.lit)) {
      this.end('won', 'all_lit');
    } else {
      if (this.player.flames > 0) this.updateShades();
      if (this.player.flames === 0) this.end('lost', 'no_flames');
      else if (this.timeLeft === 0) this.end('lost', 'dawn');
      else this.spawn();
    }
    return this.events;
  }

  snapshot() {
    const rounded = pos => pos.map(value => Number(value.toFixed(3)));
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.tick,
      state: this.state,
      time_left_s: this.timeLeft,
      score: this.score,
      player: { ...this.player, pos: rounded(this.player.pos) },
      lanterns: this.lanterns.map(lantern => ({ ...lantern, pos: rounded(lantern.pos) })),
      shades: this.shades.map(({ id, pos, state }) => ({ id, pos: rounded(pos), state })),
      motes_active: this.motes.length
    };
  }
}
