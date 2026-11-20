import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DEFAULT_INPUT, Game } from './game.mjs';

const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
const buttonFields = ['jump', 'interact', 'pulse', 'dash'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonnegative = value => Number.isFinite(value) && value >= 0;
const count = value => Number.isSafeInteger(value) && value >= 0;
const position = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const optional = (source, key, valid) => !(key in source) || valid(source[key]);
const boolean = value => typeof value === 'boolean';
const identifier = value => typeof value === 'string' && value.length > 0;

class InputError extends Error {}

function validFrames(value) {
  if (!object(value) || !Array.isArray(value.frames)) return false;
  let previousTick = -1;
  for (const frame of value.frames) {
    if (!object(frame) || !count(frame.tick) || frame.tick <= previousTick) return false;
    if (!optional(frame, 'move', move => Array.isArray(move) && move.length === 2 && move.every(n => Number.isFinite(n) && Math.abs(n) <= 1))) return false;
    if (!optional(frame, 'cam_yaw_deg', Number.isFinite)) return false;
    if (!buttonFields.every(key => optional(frame, key, boolean))) return false;
    previousTick = frame.tick;
  }
  return true;
}

function validScenario(value) {
  if (!object(value)) return false;
  if (!optional(value, 'player', player => object(player)
    && optional(player, 'pos', position) && optional(player, 'carried', count) && optional(player, 'flames', count))) return false;
  if (!optional(value, 'time_left_s', nonnegative)
    || !optional(value, 'random_motes', boolean) || !optional(value, 'random_shades', boolean)) return false;
  if (!optional(value, 'motes', motes => Array.isArray(motes) && motes.every(position))) return false;
  if (!optional(value, 'shades', shades => {
    if (!Array.isArray(shades) || !shades.every(shade => object(shade)
      && position(shade.pos) && optional(shade, 'id', identifier))) return false;
    const ids = shades.filter(shade => 'id' in shade).map(shade => shade.id);
    return new Set(ids).size === ids.length;
  })) return false;
  return optional(value, 'lanterns', lanterns => Array.isArray(lanterns)
    && lanterns.every(lantern => object(lantern) && typeof lantern.id === 'string' && /^L[1-5]$/.test(lantern.id)
      && optional(lantern, 'pos', position) && optional(lantern, 'deposited', count)
      && optional(lantern, 'lit', boolean))
    && new Set(lanterns.map(lantern => lantern.id)).size === lanterns.length);
}

function readInput(path, validate, kind, fallback) {
  if (path === undefined) return fallback;
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new InputError(kind + ': ' + error.message);
  }
  if (!validate(data)) throw new InputError(kind + ': invalid format');
  return data;
}

function integerArgument(value, name, min) {
  if (typeof value !== 'string' || !/^[+-]?\d+$/.test(value)
    || !Number.isSafeInteger(Number(value)) || Number(value) < min) {
    throw new Error('--' + name + ' requires a valid integer');
  }
  return Number(value);
}

function run() {
  const args = process.argv.slice(2);
  const seedIndex = args.indexOf('--seed');
  if (seedIndex !== -1 && /^-\d+$/.test(args[seedIndex + 1])) {
    args.splice(seedIndex, 2, '--seed=' + args[seedIndex + 1]);
  }
  const { values } = parseArgs({
    args,
    options: {
      seed: { type: 'string' }, night: { type: 'string' },
      scenario: { type: 'string' }, inputs: { type: 'string' },
      ticks: { type: 'string' }, out: { type: 'string' },
      'snapshot-every': { type: 'string', default: '10' }
    }
  });
  const seed = integerArgument(values.seed, 'seed', Number.MIN_SAFE_INTEGER);
  const ticks = integerArgument(values.ticks, 'ticks', 0);
  const cadence = integerArgument(values['snapshot-every'], 'snapshot-every', 1);
  if (values.night !== '1' || !values.out) throw new Error('--night 1 and --out <file.jsonl> are required');

  const scenario = readInput(values.scenario, validScenario, 'scenario', {});
  const { frames } = readInput(values.inputs, validFrames, 'inputs', { frames: [] });
  const game = new Game(contract.tuning, { seed, scenario });
  const rows = [JSON.stringify(game.snapshot())];
  let input = DEFAULT_INPUT;
  let frameIndex = 0;
  for (let tick = 0; tick < ticks && game.state === 'playing'; tick++) {
    if (frames[frameIndex]?.tick === tick) {
      const { tick: inputTick, ...change } = frames[frameIndex++];
      input = { ...input, ...change };
    }
    for (const event of game.step(input)) rows.push(JSON.stringify(event));
    if (game.tick % cadence === 0) rows.push(JSON.stringify(game.snapshot()));
  }
  rows.push(JSON.stringify({ type: 'end', ticks: game.tick, state: game.state, score: game.score }));
  writeFileSync(values.out, rows.join('\n') + '\n', 'utf8');
}

try {
  run();
} catch (error) {
  console.error(error.message);
  process.exitCode = error instanceof InputError ? 2 : 1;
}
