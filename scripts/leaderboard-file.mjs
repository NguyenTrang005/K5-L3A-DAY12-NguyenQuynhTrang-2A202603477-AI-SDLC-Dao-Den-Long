import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordResult, topEntries } from '../src/leaderboard.mjs';

export const leaderboardFile = resolve(process.env.LANTERN_LEADERBOARD_FILE
  ?? fileURLToPath(new URL('../.data/leaderboard.json', import.meta.url)));

export function readLeaderboard() {
  try {
    const { entries } = JSON.parse(readFileSync(leaderboardFile, 'utf8'));
    if (!Array.isArray(entries)) throw new Error('Tệp điểm không có danh sách entries.');
    return topEntries(entries);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export function addToLeaderboard(result) {
  const entries = recordResult(readLeaderboard(), result);
  mkdirSync(dirname(leaderboardFile), { recursive: true });
  const pending = leaderboardFile + '.' + process.pid + '.tmp';
  try {
    writeFileSync(pending, JSON.stringify({ entries }, null, 2) + '\n', 'utf8');
    renameSync(pending, leaderboardFile);
  } finally {
    rmSync(pending, { force: true });
  }
  return entries;
}
