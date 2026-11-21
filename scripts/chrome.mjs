import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

function browserExecutable() {
  if (process.env.LANTERN_BROWSER) return process.env.LANTERN_BROWSER;
  const candidates = ({
    win32: [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA]
      .filter(Boolean).flatMap(path => [
        join(path, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        join(path, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      ]),
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
  })[process.platform] ?? [];
  const names = process.platform === 'win32' ? ['chrome.exe', 'msedge.exe'] : ['google-chrome', 'chromium', 'chromium-browser'];
  candidates.push(...(process.env.PATH ?? '').split(delimiter).filter(Boolean).flatMap(path => names.map(name => join(path, name))));
  const browser = candidates.find(existsSync);
  if (!browser) throw new Error('Cần Chrome/Chromium để đo. Đặt LANTERN_BROWSER bằng đường dẫn đến trình duyệt nếu cần.');
  return browser;
}

export async function openChrome({ headless = false, software = false, uncapped = false } = {}) {
  if (typeof WebSocket === 'undefined') throw new Error('Lệnh này cần Node.js 22 trở lên.');
  const executable = browserExecutable();
  const profile = await mkdtemp(join(tmpdir(), 'lantern-chrome-'));
  const args = [
    '--user-data-dir=' + profile, '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-default-apps', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--window-size=1280,720', '--force-device-scale-factor=1',
    ...(headless ? ['--headless'] : []),
    ...(software ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
    ...(uncapped ? ['--disable-frame-rate-limit', '--disable-gpu-vsync'] : []),
    '--app=about:blank'
  ];
  const child = spawn(executable, args, { stdio: 'ignore', windowsHide: headless });
  let failure;
  child.on('error', error => { failure = error; });
  let socket;
  let nextId = 0;
  const waiting = new Map();

  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        waiting.delete(id);
        reject(new Error('Trình duyệt không trả lời ' + method));
      }, 5000);
      waiting.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async function close() {
    if (socket?.readyState === WebSocket.OPEN) {
      await Promise.race([call('Browser.close').catch(() => {}), delay(900)]);
      socket.close();
    }
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await rm(profile, { recursive: true, force: true, maxRetries: 2 }).catch(() => {});
  }

  try {
    let target;
    for (let attempt = 0; attempt < 100 && !target; attempt++) {
      if (failure) throw failure;
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('Trình duyệt đã thoát trước khi tải.');
      try {
        const [port] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/);
        const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list', {
          signal: AbortSignal.timeout(750)
        })).json();
        target = tabs.find(tab => tab.type === 'page');
      } catch {}
      if (!target) await delay(80);
    }
    if (!target) throw new Error('Không kết nối được cửa sổ Chrome/Chromium.');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Hết giờ mở kết nối trình duyệt.')), 3000);
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Lỗi kết nối trình duyệt.')); }, { once: true });
    });
    socket.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      const request = waiting.get(data.id);
      if (!request) return;
      waiting.delete(data.id);
      clearTimeout(request.timer);
      if (data.error) request.reject(new Error(data.error.message));
      else request.resolve(data.result);
    });
    socket.addEventListener('close', () => {
      for (const { reject, timer } of waiting.values()) {
        clearTimeout(timer);
        reject(new Error('Kết nối trình duyệt đã đóng.'));
      }
      waiting.clear();
    });
    await call('Page.enable');
    await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    return { call, close };
  } catch (error) {
    await close();
    throw error;
  }
}
