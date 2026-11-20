import { Game, TICK_RATE } from '../src/game.mjs';
import { Renderer } from './renderer.mjs';
import { GameAudio } from './audio.mjs';

const elements = Object.fromEntries([
  'scene', 'hud', 'overlay', 'panel-title', 'panel-kicker', 'panel-copy', 'panel-settings', 'actions',
  'volume', 'sensitivity', 'volume-value', 'sensitivity-value', 'accessibleColors', 'game',
  'flames', 'location', 'motes', 'mote-count', 'lanterns', 'goal', 'time', 'warning-mark', 'score', 'dash', 'pulse', 'hint', 'direction'
].map(id => [id, document.getElementById(id)]));
const keys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE', 'KeyF',
  'ShiftLeft', 'ShiftRight', 'ArrowLeft', 'ArrowRight']);
const pauseKeys = new Set(['Escape', 'KeyP']);
const STORAGE_KEY = 'dao-den-long.settings';
const sliders = ['volume', 'sensitivity'];
const timeText = seconds => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');

function settingsFromStorage() {
  const defaults = { volume: 55, sensitivity: 100, accessibleColors: false };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    for (const key of sliders) {
      const { min, max } = elements[key];
      if (Number.isFinite(saved[key])) defaults[key] = Math.min(+max, Math.max(+min, saved[key]));
    }
    defaults.accessibleColors = saved.accessibleColors === true;
  } catch {}
  return defaults;
}

function setText(id, value) {
  const text = String(value);
  if (elements[id].textContent !== text) elements[id].textContent = text;
}

try {
  const response = await fetch(new URL('../game.contract.json', import.meta.url));
  if (!response.ok) throw new Error('Không tải được thông số game.');
  const { tuning } = await response.json();
  run(tuning, new Renderer(elements.scene));
} catch (error) {
  setText('panel-title', 'Không thể mở game');
  setText('panel-copy', 'Hãy chạy game qua máy chủ trong README và sử dụng trình duyệt có WebGL.');
  console.error(error);
}

function run(tuning, renderer) {
  const active = new Set();
  const audio = new GameAudio();
  const settings = settingsFromStorage();
  const motes = Array.from({ length: tuning.capacity_max }, () => document.createElement('span'));
  elements.motes.replaceChildren(...motes);
  const makeGame = night => new Game(tuning, { night, seed: 2025 + night });
  let game = makeGame(1);
  let mode = 'menu';
  let settingsFrom = 'menu';
  let campaignScore = 0;
  let yaw = 0;
  let dragX;
  let pulseTick = -Infinity;
  let lastTime;
  let remaining = 0;
  let pauseRequested = false;
  let notice = '';
  let noticeUntil = 0;
  let countdown = 0;
  let wasWarning = false;
  let renderClock = 0;
  const pressed = code => Number(active.has(code));

  function show(view, kicker, title, copy, actions) {
    mode = view;
    elements.overlay.dataset.mode = view;
    elements.overlay.hidden = view === 'playing';
    elements.hud.hidden = !['playing', 'pause'].includes(view) && !(view === 'settings' && settingsFrom === 'pause');
    elements['panel-settings'].hidden = view !== 'settings';
    if (view === 'playing') return;
    setText('panel-kicker', kicker);
    setText('panel-title', title);
    setText('panel-copy', copy);
    const buttons = actions.map(([label, action]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', action);
      return button;
    });
    elements.actions.replaceChildren(...buttons);
    buttons[0]?.focus({ preventScroll: true });
  }

  function setGame(night) {
    game = makeGame(night);
    remaining = 0;
    yaw = 0;
    pulseTick = -Infinity;
    pauseRequested = false;
    countdown = 0;
    noticeUntil = 0;
    wasWarning = false;
    active.clear();
    updateHud();
  }

  function menu() {
    campaignScore = 0;
    setGame(1);
    show('menu', 'BA ĐÊM GIỮ LỬA', 'Đảo Đèn Lồng',
      'Theo chân Mây qua ba hòn đảo. Châm dầu và giữ đủ đèn sáng cho đến bình minh.',
      [['Bắt đầu', () => { audio.enable(settings.volume); intro(1); }], ['Cài đặt', () => openSettings('menu')]]);
  }

  function intro(night) {
    setGame(night);
    show('intro', 'ĐÊM ' + night, game.map.name,
      'Ông Đăng — “' + game.map.message + ' Giữ ít nhất ' + game.requiredLights + ' đèn sáng tới bình minh nhé.”', [['Vào đảo', enter]]);
  }

  function enter() {
    audio.enable(settings.volume);
    active.clear();
    document.activeElement?.blur();
    show('playing');
    updateHud();
  }

  function restart() {
    intro(game.night);
  }

  function pause() {
    pauseRequested = true;
  }

  function pauseMenu() {
    active.clear();
    show('pause', 'ĐÊM ' + game.night + ' · ' + game.map.name, 'Tạm dừng', '',
      [['Tiếp tục', pause], ['Chơi lại Đêm', restart], ['Cài đặt', () => openSettings('pause')], ['Về menu', menu]]);
  }

  function openSettings(from) {
    settingsFrom = from;
    syncSettings();
    show('settings', 'TÙY CHỈNH', 'Cài đặt', '', [['Quay lại', from === 'pause' ? pauseMenu : menu]]);
  }

  function syncSettings() {
    for (const key of sliders) {
      elements[key].value = settings[key];
      setText(key + '-value', settings[key] + '%');
    }
    elements.accessibleColors.checked = settings.accessibleColors;
    elements.game.classList.toggle('accessible', settings.accessibleColors);
  }

  function saveSettings() {
    syncSettings();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }

  for (const key of sliders) {
    elements[key].addEventListener('input', () => {
      settings[key] = Number(elements[key].value);
      audio.volume(settings.volume);
      saveSettings();
    });
  }
  elements.accessibleColors.addEventListener('change', () => {
    settings.accessibleColors = elements.accessibleColors.checked;
    saveSettings();
  });

  function result(reason) {
    const { night, score, state } = game;
    active.clear();
    if (state === 'won') {
      campaignScore += score;
      audio.play('won');
      if (night === 3) {
        show('dawn', 'BA HÒN ĐẢO ĐÃ SÁNG', 'Bình Minh', 'Tổng điểm ba Đêm: ' + campaignScore + '.',
          [['Về menu', menu]]);
      } else {
        show('result', 'ĐÊM ' + night + ' HOÀN TẤT', 'Đảo sáng tới bình minh!',
          'Điểm Đêm ' + night + ': ' + score + '. Tổng điểm: ' + campaignScore + '.',
          [['Đêm kế tiếp', () => intro(night + 1)], ['Về menu', menu]]);
      }
    } else {
      audio.play('lost');
      const reasonText = reason === 'dawn' ? 'Khi trời sáng, còn ít hơn ' + game.requiredLights + ' đèn đang cháy.' : 'Mây đã hết Ngọn Lửa.';
      show('result', 'ĐÊM ' + night + ' · ' + game.map.name, 'Đêm chưa qua', reasonText,
        [['Chơi lại Đêm', restart], ['Về menu', menu]]);
    }
    updateHud();
  }

  window.addEventListener('keydown', event => {
    if (pauseKeys.has(event.code)) {
      if (!['playing', 'pause', 'settings'].includes(mode)) return;
      event.preventDefault();
      if (event.repeat) return;
      if (mode === 'settings') {
        if (settingsFrom === 'pause') pauseMenu();
        else menu();
      } else pause();
      return;
    }
    if (mode !== 'playing' || !keys.has(event.code)) return;
    event.preventDefault();
    active.add(event.code);
  });
  window.addEventListener('keyup', event => active.delete(event.code));
  window.addEventListener('blur', () => active.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) active.clear(); });
  elements.scene.addEventListener('pointerdown', event => {
    if (event.button !== 0 || mode !== 'playing') return;
    dragX = event.clientX;
    elements.scene.setPointerCapture(event.pointerId);
  });
  elements.scene.addEventListener('pointermove', event => {
    if (dragX === undefined || mode !== 'playing') return;
    yaw = (yaw - (event.clientX - dragX) * .34 * settings.sensitivity / 100) % 360;
    dragX = event.clientX;
  });
  elements.scene.addEventListener('lostpointercapture', () => { dragX = undefined; });

  function updateHud() {
    const seconds = Math.ceil(game.timeLeft);
    const light = game.lanterns.filter(lantern => lantern.lit).length;
    setText('flames', '✦'.repeat(game.player.flames) + '◇'.repeat(tuning.flames - game.player.flames));
    elements.flames.setAttribute('aria-label', game.player.flames + ' Ngọn Lửa');
    setText('location', 'Đêm ' + game.night + ' · ' + game.map.name);
    setText('lanterns', light + ' / ' + game.lanterns.length);
    setText('goal', 'Cần ' + game.requiredLights + ' lúc bình minh');
    setText('time', timeText(seconds));
    elements.time.closest('.timer').classList.toggle('danger', seconds <= 30);
    elements['warning-mark'].hidden = seconds > 30 || !settings.accessibleColors;
    setText('score', game.score);
    setText('mote-count', game.player.carried + ' / ' + game.capacity);
    const grid = String(game.capacity);
    if (elements.motes.style.getPropertyValue('--capacity') !== grid) elements.motes.style.setProperty('--capacity', grid);
    motes.forEach((slot, index) => {
      slot.hidden = index >= game.capacity;
      slot.classList.toggle('lit', index < game.player.carried);
    });
    const cooldown = end => Math.max(0, end - game.simTick) / TICK_RATE;
    const dash = cooldown(game.dashUntil), pulse = cooldown(game.pulseUntil);
    setText('dash', game.simTick < game.charmUntil ? 'Bùa Gió' : dash ? dash.toFixed(1) + ' s' : 'Sẵn sàng');
    setText('pulse', pulse ? pulse.toFixed(1) + ' s' : tuning.pulse_cost + ' đom đóm');
    const lantern = game.targetLantern();
    let hint = game.windWarning ? 'Gió mạnh sắp nổi' : '';
    if (lantern?.lit) hint = 'E — Châm dầu (' + Math.ceil(lantern.fuelUnits / TICK_RATE) + '/' + tuning.fuel_max + ')';
    else if (lantern) hint = 'E — Nạp ánh sáng (' + lantern.deposited + '/' + game.lanternCost(lantern) + ')';
    setText('hint', mode === 'playing' ? (hint || (game.simTick < noticeUntil ? notice : '')) : '');
  }

  function updateDirection() {
    if (mode !== 'playing') {
      elements.direction.hidden = true;
      return;
    }
    const [x, , z] = game.player.pos;
    let nearest;
    let distance = Infinity;
    for (const item of game.lanterns) {
      const gap = Math.hypot(item.pos[0] - x, item.pos[2] - z);
      if (!item.lit && gap < distance) { nearest = item; distance = gap; }
    }
    if (!nearest || renderer.visible([nearest.pos[0], nearest.pos[1] + 3, nearest.pos[2]])) {
      elements.direction.hidden = true;
      return;
    }
    const angle = yaw * Math.PI / 180 - Math.atan2(nearest.pos[0] - x, nearest.pos[2] - z);
    elements.direction.style.setProperty('--dx', Math.sin(angle) * elements.scene.clientWidth * .43 + 'px');
    elements.direction.style.setProperty('--dy', -Math.cos(angle) * elements.scene.clientHeight * .30 + 'px');
    elements.direction.style.setProperty('--turn', angle + 'rad');
    elements.direction.hidden = false;
  }

  function step() {
    const playing = mode === 'playing';
    if (playing) yaw = (yaw + (pressed('ArrowLeft') - pressed('ArrowRight')) * 1.6) % 360;
    const events = game.step({
      move: playing ? [pressed('KeyA') - pressed('KeyD'), pressed('KeyW') - pressed('KeyS')] : [0, 0],
      cam_yaw_deg: yaw, jump: playing && active.has('Space'),
      interact: playing && active.has('KeyE'), pulse: playing && active.has('KeyF'),
      dash: playing && (active.has('ShiftLeft') || active.has('ShiftRight')), pause: pauseRequested
    });
    pauseRequested = false;
    for (const event of events) {
      audio.play(event.name);
      if (event.name === 'paused') pauseMenu();
      if (event.name === 'resumed') enter();
      if (event.name === 'pulse') pulseTick = game.simTick;
      if (event.name === 'player_hit' || event.name === 'drifter_steal') {
        notice = event.name === 'drifter_steal' ? 'Gió Lạc vừa cướp đom đóm' :
          event.data.by === 'fall' ? 'Mây rơi khỏi đảo' : 'Mây mất một Ngọn Lửa';
        noticeUntil = game.simTick + 95;
      }
      if (event.name === 'game_over') result(event.data.reason);
    }
    if (mode !== 'playing') return;
    if (game.platformEvent === 'jump' && !game.respawnAt) audio.play('jump');
    if (game.windWarning && !wasWarning) audio.play('wind');
    wasWarning = game.windWarning;
    const seconds = Math.ceil(game.timeLeft);
    if (seconds <= 10 && seconds > 0 && seconds !== countdown) {
      countdown = seconds;
      audio.play('countdown');
    }
  }

  const ticking = () => ['playing', 'pause'].includes(mode) || (mode === 'settings' && settingsFrom === 'pause');
  function animate(now) {
    const elapsed = lastTime === undefined ? 0 : Math.min(.125, (now - lastTime) / 1000);
    lastTime = now;
    if (ticking()) {
      remaining += elapsed * TICK_RATE;
      while (remaining >= 1 && ticking()) { step(); remaining--; }
    }
    if (mode === 'playing' || mode === 'menu' || mode === 'intro') renderClock += elapsed;
    if (mode === 'playing') audio.ambience();
    renderer.render(game, yaw, renderClock, pulseTick, settings.accessibleColors);
    if (ticking()) updateHud();
    updateDirection();
    requestAnimationFrame(animate);
  }

  syncSettings();
  menu();
  requestAnimationFrame(animate);
}
