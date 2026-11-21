import { readFileSync, writeFileSync } from 'node:fs';
import { createRandom, Game, TICK_RATE } from '../src/game.mjs';
import { commandArgs } from './runtime-args.mjs';

const { tuning } = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
const memory = () => process.memoryUsage.rss() / (1024 * 1024);
const round = value => Number(value.toFixed(3));

function playNight(game, seed) {
  const random = createRandom(seed);
  let move = [0, 0];
  const inputs = Array.from({ length: 2 }, () => ({ move, cam_yaw_deg: 0, pause: false }));
  const limit = tuning['night' + game.night + '_duration_s'] * TICK_RATE;
  for (let tick = 0; tick < limit && game.state === 'playing'; tick++) {
    if (tick % 30 === 0) {
      const angle = random() * 2 * Math.PI;
      move = [Math.cos(angle), Math.sin(angle)];
    }
    // Game giữ input tick trước để phát hiện cạnh nhấn.
    const input = inputs[tick % 2];
    input.move = move;
    input.jump = random() < .05;
    input.dash = random() < .03;
    input.pulse = random() < .02;
    input.interact = random() < .10;
    game.step(input);
  }
  return game.state;
}

function run() {
  const { seed, count: nights, out } = commandArgs(process.argv.slice(2), 'nights', true);
  const results = [];
  const startedAt = performance.now();
  let crashes = 0;
  let game = new Game(tuning, { night: 1, seed });
  globalThis.gc?.();
  const mem_start_mb = memory();
  for (let i = 0; i < nights; i++) {
    try {
      if (i > 0) game = new Game(tuning, { night: i % 3 + 1, seed: seed + i });
      results.push(playNight(game, seed + i));
    } catch (error) {
      crashes++;
      results.push('crash');
      console.error('Đêm ' + (i + 1) + ': ' + error.message);
    } finally {
      game = undefined;
    }
  }
  globalThis.gc?.();
  const result = {
    nights, crashes, results, mem_start_mb: round(mem_start_mb), mem_end_mb: round(memory()),
    duration_s: round((performance.now() - startedAt) / 1000)
  };
  writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}

try { run(); } catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
