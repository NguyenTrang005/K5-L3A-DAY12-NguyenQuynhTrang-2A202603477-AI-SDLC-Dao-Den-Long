import { Game, TICK_RATE } from '../src/game.mjs';
import { Renderer } from './renderer.mjs';
import { GameAudio } from './audio.mjs';
import { ACTION_NAMES, DEFAULT_BINDINGS, actionForCode, assignBinding, keyLabel, storedBindings } from './controls.mjs';
import { validName } from '../src/leaderboard.mjs';
import { listScores, saveScore } from './leaderboard.mjs';

const elements = Object.fromEntries([
  'scene', 'hud', 'overlay', 'panel-title', 'panel-kicker', 'panel-copy', 'panel-settings', 'actions',
  'volume', 'sensitivity', 'volume-value', 'sensitivity-value', 'accessibleColors', 'reducedMotion', 'largeText', 'game',
  'flames', 'location', 'motes', 'mote-count', 'lanterns', 'goal', 'time', 'warning-mark', 'score', 'dash', 'pulse', 'hint', 'direction',
  'binding-panel', 'binding-grid', 'binding-status', 'ranking', 'ranking-status', 'ranking-rows',
  'score-form', 'score-name', 'score-status', 'score-save',
  'move-key', 'jump-key', 'dash-key', 'pulse-key', 'pause-key',
  'shade-direction', 'shade-cue', 'wind-cue', 'countdown-cue', 'fuel-cue'
].map(id => [id, document.getElementById(id)]));
const STORAGE_KEY = 'dao-den-long.settings';
const sliders = ['volume', 'sensitivity'];
const toggles = ['accessibleColors', 'reducedMotion', 'largeText'];
const CAMPAIGN_SEED = 2026;
const timeText = seconds => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');

function settingsFromStorage() {
  const defaults = {
    volume: 55, sensitivity: 100, accessibleColors: false, reducedMotion: false, largeText: false,
    bindings: { ...DEFAULT_BINDINGS }
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    for (const key of sliders) {
      const { min, max } = elements[key];
      if (Number.isFinite(saved[key])) defaults[key] = Math.min(+max, Math.max(+min, saved[key]));
    }
    for (const key of toggles) defaults[key] = saved[key] === true;
    defaults.bindings = storedBindings(saved.bindings);
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
  const active = new Map();
  const audio = new GameAudio();
  const settings = settingsFromStorage();
  const reduceMotionMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const motes = Array.from({ length: tuning.capacity_max }, () => document.createElement('span'));
  elements.motes.replaceChildren(...motes);
  const makeGame = night => new Game(tuning, { night, seed: CAMPAIGN_SEED + night - 1 });
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
  let remapping;
  let pendingScore;
  let newestShade;
  let shadeNoticeUntil = 0;
  const pressed = action => {
    for (const value of active.values()) if (value === action) return 1;
    return 0;
  };

  function show(view, kicker, title, copy, actions) {
    mode = view;
    elements.overlay.dataset.mode = view;
    elements.overlay.hidden = view === 'playing';
    elements.hud.hidden = !['playing', 'pause'].includes(view)
      && !(['settings', 'bindings'].includes(view) && settingsFrom === 'pause');
    elements['panel-settings'].hidden = view !== 'settings';
    elements['binding-panel'].hidden = view !== 'bindings';
    elements.ranking.hidden = view !== 'leaderboard';
    elements['score-form'].hidden = true;
    pendingScore = undefined;
    remapping = undefined;
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
    newestShade = undefined;
    shadeNoticeUntil = 0;
    active.clear();
    updateHud();
  }

  function menu() {
    campaignScore = 0;
    setGame(1);
    show('menu', 'BA ĐÊM GIỮ LỬA', 'Đảo Đèn Lồng',
      'Theo chân Mây qua ba hòn đảo. Châm dầu và giữ đủ đèn sáng cho đến bình minh.',
      [['Bắt đầu', () => { audio.enable(settings.volume); intro(1); }], ['Bảng xếp hạng', openLeaderboard],
        ['Cài đặt', () => openSettings('menu')]]);
  }

  async function openLeaderboard() {
    show('leaderboard', '', 'Bảng xếp hạng', '', [['Về menu', menu]]);
    setText('ranking-status', 'Đang tải bảng điểm…');
    elements['ranking-rows'].replaceChildren();
    try {
      const entries = await listScores();
      if (mode !== 'leaderboard') return;
      const rows = entries.map((entry, index) => {
        const row = document.createElement('tr');
        for (const value of [index + 1, entry.name, entry.score, entry.nights_won + ' / 3']) {
          row.insertCell().textContent = value;
        }
        return row;
      });
      elements['ranking-rows'].replaceChildren(...rows);
      setText('ranking-status', entries.length ? '' : 'Chưa có điểm nào được lưu.');
    } catch (error) {
      if (mode === 'leaderboard') setText('ranking-status', error.message);
    }
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
    show('settings', '', 'Cài đặt', '', [
      ['Đổi phím', openBindings], ['Quay lại', from === 'pause' ? pauseMenu : menu]
    ]);
  }

  function renderBindings(focusAction) {
    const rows = Object.entries(ACTION_NAMES).map(([action, label]) => {
      const row = document.createElement('div');
      const title = document.createElement('span');
      const button = document.createElement('button');
      title.textContent = label;
      button.type = 'button';
      button.dataset.binding = action;
      button.textContent = remapping === action ? 'Nhấn phím…' : keyLabel(settings.bindings[action]);
      button.setAttribute('aria-label', label + ': ' + button.textContent);
      button.addEventListener('click', () => {
        remapping = remapping === action ? undefined : action;
        setText('binding-status', remapping ? 'Nhấn phím mới cho ' + label + '.' : '');
        renderBindings(action);
      });
      row.append(title, button);
      return row;
    });
    elements['binding-grid'].replaceChildren(...rows);
    if (focusAction) elements['binding-grid'].querySelector('[data-binding="' + focusAction + '"]')?.focus();
  }

  function openBindings() {
    show('bindings', '', 'Đổi phím', '', [
      ['Khôi phục mặc định', () => {
        remapping = undefined;
        settings.bindings = { ...DEFAULT_BINDINGS };
        saveSettings();
        renderBindings();
        setText('binding-status', 'Đã khôi phục phím mặc định.');
      }],
      ['Quay lại', () => openSettings(settingsFrom)]
    ]);
    setText('binding-status', '');
    renderBindings();
  }

  function syncSettings() {
    for (const key of sliders) {
      elements[key].value = settings[key];
      setText(key + '-value', settings[key] + '%');
    }
    for (const key of toggles) elements[key].checked = settings[key];
    elements.game.classList.toggle('accessible', settings.accessibleColors);
    elements.game.classList.toggle('reduce-motion', settings.reducedMotion || reduceMotionMedia.matches);
    document.documentElement.classList.toggle('large-text', settings.largeText);
    for (const action of ['jump', 'dash', 'pulse', 'pause']) setText(action + '-key', keyLabel(settings.bindings[action]));
    setText('move-key', ['forward', 'left', 'backward', 'right'].map(action => keyLabel(settings.bindings[action])).join(' '));
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
  for (const key of toggles) elements[key].addEventListener('change', () => {
    settings[key] = elements[key].checked;
    saveSettings();
  });
  reduceMotionMedia.addEventListener('change', syncSettings);

  function scoreForm(nightsWon) {
    pendingScore = { score: campaignScore, nights_won: nightsWon, seed: CAMPAIGN_SEED };
    elements['score-form'].reset();
    elements['score-form'].hidden = false;
    elements['score-save'].disabled = false;
    setText('score-status', '');
  }

  elements['score-form'].noValidate = true;
  elements['score-form'].addEventListener('submit', async event => {
    event.preventDefault();
    const current = pendingScore;
    const name = elements['score-name'].value;
    if (!current || elements['score-save'].disabled) return;
    if (!validName(name)) {
      setText('score-status', 'Hãy dùng 3–12 ký tự A–Z, a–z, 0–9 hoặc _.');
      elements['score-name'].focus();
      return;
    }
    elements['score-save'].disabled = true;
    setText('score-status', 'Đang lưu điểm…');
    try {
      await saveScore({ name, ...current });
      if (pendingScore !== current) return;
      pendingScore = undefined;
      setText('score-status', 'Đã gửi điểm vào bảng xếp hạng.');
    } catch (error) {
      if (pendingScore !== current) return;
      elements['score-save'].disabled = false;
      setText('score-status', error.message);
    }
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
        scoreForm(3);
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
      scoreForm(night - 1);
    }
    updateHud();
  }

  window.addEventListener('keydown', event => {
    if (mode === 'bindings' && remapping && event.code !== 'Tab') {
      event.preventDefault();
      if (event.repeat) return;
      const action = remapping;
      try {
        settings.bindings = assignBinding(settings.bindings, action, event.code);
        remapping = undefined;
        saveSettings();
        renderBindings(action);
        setText('binding-status', 'Đã đổi ' + ACTION_NAMES[action] + ' sang ' + keyLabel(event.code) + '.');
      } catch (error) {
        setText('binding-status', error.message);
      }
      return;
    }
    const action = actionForCode(settings.bindings, event.code);
    if (action === 'pause') {
      if (!['playing', 'pause', 'settings', 'bindings'].includes(mode)) return;
      event.preventDefault();
      if (event.repeat) return;
      if (mode === 'bindings') {
        openSettings(settingsFrom);
      } else if (mode === 'settings') {
        if (settingsFrom === 'pause') pauseMenu();
        else menu();
      } else pause();
      return;
    }
    if (mode !== 'playing' || !action) return;
    event.preventDefault();
    active.set(event.code, action);
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
    const key = keyLabel(settings.bindings.interact);
    let hint = '';
    if (lantern?.lit) hint = key + ' — Châm dầu (' + Math.ceil(lantern.fuelUnits / TICK_RATE) + '/' + tuning.fuel_max + ')';
    else if (lantern) hint = key + ' — Nạp ánh sáng (' + lantern.deposited + '/' + game.lanternCost(lantern) + ')';
    setText('hint', mode === 'playing' ? (hint || (game.simTick < noticeUntil ? notice : '')) : '');
    const playing = mode === 'playing';
    const weak = playing && game.nearestLantern(game.player.pos, lamp => game.weakLantern(lamp));
    setText('shade-cue', playing && newestShade && game.simTick < shadeNoticeUntil ? 'Bóng Mực vừa xuất hiện' : '');
    setText('wind-cue', playing && game.windWarning ? 'Gió mạnh sắp thổi' : '');
    setText('countdown-cue', playing && seconds > 0 && seconds <= 10 ? 'Bình minh sau ' + seconds + ' giây' : '');
    setText('fuel-cue', weak ? 'Đèn ' + weak.id + ' sắp cạn dầu' : '');
  }

  function pointArrow(element, [targetX, , targetZ], verticalRadius) {
    const [x, , z] = game.player.pos;
    const angle = yaw * Math.PI / 180 - Math.atan2(targetX - x, targetZ - z);
    const sine = Math.sin(angle), cosine = Math.cos(angle);
    const edge = element === elements['shade-direction'] ? Math.max(Math.abs(sine), Math.abs(cosine)) : 1;
    element.style.setProperty('--dx', sine / edge * elements.scene.clientWidth * .43 + 'px');
    element.style.setProperty('--dy', -cosine / edge * elements.scene.clientHeight * verticalRadius + 'px');
    element.style.setProperty('--turn', angle + 'rad');
    element.hidden = false;
  }

  function updateDirection() {
    if (mode !== 'playing') {
      elements.direction.hidden = true;
      elements['shade-direction'].hidden = true;
      return;
    }
    if (newestShade && game.simTick < shadeNoticeUntil) pointArrow(elements['shade-direction'], newestShade, .41);
    else elements['shade-direction'].hidden = true;
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
    pointArrow(elements.direction, nearest.pos, .30);
  }

  function step() {
    const playing = mode === 'playing';
    if (playing) yaw = (yaw + (pressed('cameraLeft') - pressed('cameraRight')) * 1.6) % 360;
    const events = game.step({
      move: playing ? [pressed('left') - pressed('right'), pressed('forward') - pressed('backward')] : [0, 0],
      cam_yaw_deg: yaw, jump: playing && Boolean(pressed('jump')),
      interact: playing && Boolean(pressed('interact')), pulse: playing && Boolean(pressed('pulse')),
      dash: playing && Boolean(pressed('dash')), pause: pauseRequested
    });
    pauseRequested = false;
    for (const event of events) {
      audio.play(event.name);
      if (event.name === 'paused') pauseMenu();
      if (event.name === 'resumed') enter();
      if (event.name === 'pulse') pulseTick = game.simTick;
      if (event.name === 'shade_spawned') {
        newestShade = game.shades.find(shade => shade.id === event.data.id)?.pos;
        shadeNoticeUntil = game.simTick + 180;
      }
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

  const ticking = () => ['playing', 'pause'].includes(mode)
    || (['settings', 'bindings'].includes(mode) && settingsFrom === 'pause');
  function animate(now) {
    const elapsed = lastTime === undefined ? 0 : Math.min(.125, (now - lastTime) / 1000);
    lastTime = now;
    if (ticking()) {
      remaining += elapsed * TICK_RATE;
      while (remaining >= 1 && ticking()) { step(); remaining--; }
    }
    if (mode === 'playing' || mode === 'menu' || mode === 'intro') renderClock += elapsed;
    if (mode === 'playing') audio.ambience();
    renderer.render(game, yaw, renderClock, pulseTick, {
      accessibleColors: settings.accessibleColors, reducedMotion: settings.reducedMotion || reduceMotionMedia.matches
    });
    if (ticking()) updateHud();
    updateDirection();
    requestAnimationFrame(animate);
  }

  syncSettings();
  menu();
  requestAnimationFrame(animate);
}
