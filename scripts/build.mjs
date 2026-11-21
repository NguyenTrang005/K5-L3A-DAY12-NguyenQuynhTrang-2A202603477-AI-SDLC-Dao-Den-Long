import { copyFile, mkdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await Promise.all(['src/', 'web/'].map(path => mkdir(new URL(path, dist), { recursive: true })));
const files = {
  'web/index.html': 'index.html',
  'web/style.css': 'web/style.css',
  'web/client.mjs': 'web/client.mjs',
  'web/renderer.mjs': 'web/renderer.mjs',
  'web/audio.mjs': 'web/audio.mjs',
  'web/controls.mjs': 'web/controls.mjs',
  'web/leaderboard.mjs': 'web/leaderboard.mjs',
  'web/benchmark.html': 'web/benchmark.html',
  'web/benchmark.mjs': 'web/benchmark.mjs',
  'src/game.mjs': 'src/game.mjs',
  'src/maps.mjs': 'src/maps.mjs',
  'src/leaderboard.mjs': 'src/leaderboard.mjs',
  'game.contract.json': 'game.contract.json'
};
await Promise.all(Object.entries(files).map(([source, target]) =>
  copyFile(new URL(source, root), new URL(target, dist))));
console.log('Bản web đã được tạo trong dist/.');
