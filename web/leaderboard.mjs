import { recordResult, topEntries } from '../src/leaderboard.mjs';

const storageKey = 'dao-den-long.leaderboard';
const endpoint = new URL('../api/leaderboard', import.meta.url);
let browserStorage;

async function call(method, payload) {
  const response = await fetch(endpoint, {
    method, headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload && JSON.stringify(payload)
  });
  if (response.status === 404 || response.status === 405 || response.headers.get('content-type')?.includes('text/html')) {
    browserStorage = true;
    return null;
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Không thể đọc bảng xếp hạng.');
  return data.entries;
}

function localEntries() {
  const entries = JSON.parse(localStorage.getItem(storageKey)) ?? [];
  return topEntries(entries);
}

export async function listScores() {
  if (!browserStorage) {
    const remote = await call('GET');
    if (remote) return remote;
  }
  return localEntries();
}

export async function saveScore(result) {
  if (!browserStorage) {
    const remote = await call('POST', result);
    if (remote) return remote;
  }
  const entries = recordResult(localEntries(), result);
  localStorage.setItem(storageKey, JSON.stringify(entries));
  return entries;
}
