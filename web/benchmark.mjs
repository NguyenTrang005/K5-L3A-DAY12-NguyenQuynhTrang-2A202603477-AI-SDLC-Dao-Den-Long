import { createRandom, Game, TICK_RATE } from '../src/game.mjs';
import { Renderer } from './renderer.mjs';

const TAU = 2 * Math.PI;

function positions(count, elevation, random) {
  return Array.from({ length: count }, (_, index) => {
    const radius = 38 * Math.sqrt((index + .5) / count);
    const angle = index * 2.399963229728653 + random() * .35;
    return [radius * Math.cos(angle), elevation, radius * Math.sin(angle)];
  });
}

export function renderMetrics(intervals) {
  const ordered = intervals.toSorted((a, b) => a - b);
  const frames = ordered.length;
  const tail = ordered.slice(-Math.max(1, Math.ceil(frames * .01)));
  const sum = items => items.reduce((total, item) => total + item, 0);
  const round = value => Number(value.toFixed(2));
  if (!frames) throw new Error('Không thu được khung hình benchmark.');
  return {
    avg_fps: round(1000 * frames / sum(ordered)),
    p1_low_fps: round(1000 * tail.length / sum(tail)),
    frame_ms_p95: round(ordered[Math.ceil(frames * .95) - 1]),
    frames
  };
}

export function createBenchmarkGame(tuning, seed) {
  const random = createRandom(seed);
  return new Game(tuning, { seed, night: 1, scenario: {
    random_motes: false, random_shades: false, random_drifters: false,
    motes: positions(100, 0, random),
    shades: positions(200, .8, random).map(pos => ({ pos, state: 'wander' })),
    lanterns: ['L1', 'L2', 'L3'].map(id => ({ id, lit: true, fuel: 100 }))
  } });
}

async function benchmark() {
  const params = new URL(location.href).searchParams;
  const seed = Number(params.get('seed'));
  const duration = Number(params.get('duration')) * 1000;
  const { tuning } = await (await fetch('../game.contract.json')).json();
  const game = createBenchmarkGame(tuning, seed);
  const renderer = new Renderer(document.querySelector('#scene'));
  const gl = renderer.gl;
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  const status = document.querySelector('#status');
  const intervals = [];
  let firstFrameEpoch;
  let start;
  let previous;
  let pendingTicks = 0;
  let measuring = false;

  function frame(now) {
    const elapsed = start === undefined ? 0 : now - start;
    if (elapsed >= 3000 + duration) {
      window.benchmarkResult = { ...renderMetrics(intervals), firstFrameEpoch, gpu,
        mode: renderer.instancing ? 'WebGL 1 / ANGLE instancing' : 'WebGL 1', };
      return;
    }
    if (start === undefined) start = now;
    if (previous !== undefined) {
      const interval = now - previous;
      pendingTicks += Math.min(interval, 125) * TICK_RATE / 1000;
      while (pendingTicks >= 1) {
        game.stepBenchmark();
        pendingTicks--;
      }
      if (elapsed >= 3000 && interval > 0) intervals.push(interval);
    }
    if (!measuring && elapsed >= 3000) {
      measuring = true;
      status.hidden = true;
    }
    previous = now;
    const angle = elapsed * TAU / 15000;
    renderer.render(game, 0, elapsed / 1000, -Infinity, {
      benchmark: true, camera: { eye: [30 * Math.cos(angle), 15, 30 * Math.sin(angle)], target: [0, 0, 0] }
    });
    gl.finish();
    if (firstFrameEpoch === undefined) {
      firstFrameEpoch = performance.timeOrigin + performance.now();
      status.textContent = 'Đang khởi động…';
    }
    requestAnimationFrame(nextFrame);
  }

  function nextFrame(now) {
    try { frame(now); } catch (error) { window.benchmarkError = error.message; }
  }
  requestAnimationFrame(nextFrame);
}

if (typeof window !== 'undefined') {
  benchmark().catch(error => { window.benchmarkError = error.message; });
}
