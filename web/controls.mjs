export const DEFAULT_BINDINGS = Object.freeze({
  forward: 'KeyW', left: 'KeyA', backward: 'KeyS', right: 'KeyD', jump: 'Space',
  dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyF', pause: 'Escape'
});

export const ACTION_NAMES = Object.freeze({
  forward: 'Đi tới', left: 'Qua trái', backward: 'Lùi', right: 'Qua phải', jump: 'Nhảy',
  dash: 'Lướt', interact: 'Nạp đèn', pulse: 'Tỏa Sáng', pause: 'Tạm dừng'
});

export function assignBinding(bindings, action, code) {
  if (!Object.hasOwn(DEFAULT_BINDINGS, action) || typeof code !== 'string' || !/^[A-Z][A-Za-z0-9]{1,24}$/.test(code)
    || /^(Tab|MetaLeft|MetaRight|F[1-9][0-9]*)$/.test(code)) {
    throw new Error('Hãy chọn phím khác. Phím này dành cho trình duyệt hoặc điều hướng.');
  }
  const occupied = Object.keys(bindings).find(key => key !== action && bindings[key] === code);
  if (occupied) throw new Error('Phím ' + keyLabel(code) + ' đang dùng cho ' + ACTION_NAMES[occupied] + '.');
  return { ...bindings, [action]: code };
}

export function storedBindings(value) {
  const defaults = { ...DEFAULT_BINDINGS };
  if (!value || typeof value !== 'object') return defaults;
  const combined = Object.fromEntries(Object.keys(defaults).map(key => [key, value[key] ?? defaults[key]]));
  try {
    for (const [action, code] of Object.entries(combined)) assignBinding(combined, action, code);
    return combined;
  } catch { return defaults; }
}

export function actionForCode(bindings, code) {
  const action = Object.keys(bindings).find(key => bindings[key] === code);
  if (action) return action;
  if (code === 'ShiftRight' && bindings.dash === 'ShiftLeft') return 'dash';
  if (code === 'KeyP' && bindings.pause === 'Escape') return 'pause';
  if (code === 'ArrowLeft') return 'cameraLeft';
  if (code === 'ArrowRight') return 'cameraRight';
}

export function keyLabel(code) {
  return ({
    Escape: 'Esc', ShiftLeft: 'Shift', ShiftRight: 'Shift phải', ArrowLeft: '←',
    ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓'
  })[code] ?? code.replace(/^(Key|Digit)/, '');
}
