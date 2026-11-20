import { Game, TICK_RATE } from '../src/game.mjs';
import { Renderer } from './renderer.mjs';

const canvas = document.querySelector('#scene');
const overlay = document.querySelector('#overlay');
const play = document.querySelector('#play');
const title = document.querySelector('#panel-title');
const description = document.querySelector('#panel-copy');
const ui = Object.fromEntries(['flames', 'motes', 'lanterns', 'time', 'score', 'pulse', 'hint']
  .map(name => [name, document.getElementById(name)]));
const keyCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE', 'KeyF', 'ArrowLeft', 'ArrowRight']);

try {
  const response = await fetch(new URL('../game.contract.json', import.meta.url));
  if (!response.ok) throw new Error('Không tải được thông số game.');
  const { tuning } = await response.json();
  const renderer = new Renderer(canvas);
  run(tuning, renderer);
} catch (error) {
  title.textContent = 'Không thể mở game';
  description.textContent = 'Hãy chạy game qua máy chủ trong README và sử dụng trình duyệt có WebGL.';
  play.hidden = true;
  console.error(error);
}

function run(tuning, renderer) {
  const active = new Set();
  const makeGame = () => new Game(tuning, { seed: 2026 });
  let game = makeGame();
  let started = false;
  let yaw = 0;
  let dragX;
  let pulseTick = -Infinity;
  let lastTime;
  let remaining = 0;
  let notice = '';
  let noticeUntil = 0;

  const pressed = code => Number(active.has(code));
  const put = (name, value) => {
    const text = String(value);
    if (ui[name].textContent !== text) ui[name].textContent = text;
  };

  function updateHud() {
    const seconds = Math.ceil(game.timeLeft);
    const lanternCount = game.lanterns.filter(lantern => lantern.lit).length;
    put('flames', '✦'.repeat(game.player.flames) + '◇'.repeat(tuning.flames - game.player.flames));
    ui.flames.setAttribute('aria-label', game.player.flames + ' ánh lửa');
    put('motes', game.player.carried + ' / ' + tuning.carry_capacity);
    put('lanterns', lanternCount + ' / ' + game.lanterns.length);
    put('time', Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0'));
    put('score', game.score);
    const cooldown = Math.max(0, game.pulseUntil - game.tick) / TICK_RATE;
    put('pulse', cooldown ? '(' + Math.ceil(cooldown) + 's)' : '(' + tuning.pulse_cost + ' đom đóm)');
    const target = game.targetLantern();
    let hint = '';
    if (started && game.state === 'playing') {
      if (game.tick < noticeUntil) hint = notice;
      else if (target) hint = game.player.carried
        ? 'E · Nạp đèn (' + target.deposited + ' / ' + tuning.lantern_cost + ')'
        : 'Cần đom đóm để thắp đèn';
    }
    put('hint', hint);
  }

  play.addEventListener('click', () => {
    game = makeGame();
    started = true;
    remaining = 0;
    pulseTick = -Infinity;
    noticeUntil = 0;
    yaw = 0;
    active.clear();
    overlay.hidden = true;
    play.blur();
    updateHud();
  });

  window.addEventListener('keydown', event => {
    if (!keyCodes.has(event.code) || !started || game.state !== 'playing') return;
    event.preventDefault();
    active.add(event.code);
  });
  window.addEventListener('keyup', event => active.delete(event.code));
  window.addEventListener('blur', () => active.clear());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) active.clear();
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !started || game.state !== 'playing') return;
    dragX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (dragX === undefined) return;
    yaw = (yaw - (event.clientX - dragX) * .34) % 360;
    dragX = event.clientX;
  });
  canvas.addEventListener('lostpointercapture', () => { dragX = undefined; });

  function step() {
    yaw = (yaw + (pressed('ArrowLeft') - pressed('ArrowRight')) * 1.6) % 360;
    const events = game.step({
      move: [pressed('KeyA') - pressed('KeyD'), pressed('KeyW') - pressed('KeyS')],
      cam_yaw_deg: yaw,
      jump: active.has('Space'),
      interact: active.has('KeyE'),
      pulse: active.has('KeyF')
    });
    for (const event of events) {
      if (event.name === 'pulse') pulseTick = game.tick;
      if (event.name === 'player_hit') {
        notice = 'Bóng Mực chạm vào Mây. Mất một ánh lửa.';
        noticeUntil = game.tick + 100;
      }
      if (event.name === 'game_over') {
        const won = event.data.result === 'won';
        title.textContent = won ? 'Đảo đã sáng!' : 'Đêm chưa qua';
        const summary = won ? 'Mây đã thắp lại cả năm đèn.' : event.data.reason === 'dawn'
          ? 'Trời đã sáng trước khi Mây thắp hết đèn.' : 'Mây đã hết ánh lửa.';
        description.textContent = summary + ' Điểm: ' + game.score + '.';
        play.textContent = 'Chơi lại';
        overlay.hidden = false;
        active.clear();
      }
    }
  }

  function animate(now) {
    const elapsed = lastTime === undefined ? 0 : Math.min(.125, (now - lastTime) / 1000);
    lastTime = now;
    if (started && game.state === 'playing') {
      remaining += elapsed * TICK_RATE;
      while (remaining >= 1 && game.state === 'playing') {
        step();
        remaining--;
      }
      updateHud();
    }
    renderer.render(game, yaw, now / 1000, pulseTick);
    requestAnimationFrame(animate);
  }

  updateHud();
  requestAnimationFrame(animate);
}
