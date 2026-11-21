import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { addToLeaderboard, readLeaderboard } from './leaderboard-file.mjs';
import { validResult } from '../src/leaderboard.mjs';

const dist = new URL('../dist/', import.meta.url);
const contentTypes = new Map([
  ['html', 'text/html'], ['css', 'text/css'], ['mjs', 'text/javascript'], ['json', 'application/json']
]);
const files = new Set([
  'index.html', 'web/style.css', 'web/client.mjs', 'web/renderer.mjs', 'web/audio.mjs',
  'web/controls.mjs', 'web/leaderboard.mjs', 'web/benchmark.html', 'web/benchmark.mjs',
  'src/game.mjs', 'src/maps.mjs', 'src/leaderboard.mjs', 'game.contract.json'
]);

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

async function leaderboard(request, response) {
  if (request.method === 'GET') return json(response, 200, { entries: readLeaderboard() });
  if (request.method !== 'POST') return json(response, 405, { error: 'Chỉ hỗ trợ GET và POST.' });
  if (request.headers.origin && request.headers.origin !== 'http://' + request.headers.host) {
    return json(response, 403, { error: 'Yêu cầu lưu điểm phải đến từ trang game.' });
  }
  if (!request.headers['content-type']?.startsWith('application/json')) {
    return json(response, 415, { error: 'Dữ liệu phải là JSON.' });
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= 2048) chunks.push(chunk);
  }
  if (size > 2048) return json(response, 413, { error: 'Dữ liệu quá lớn.' });
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks)); } catch {}
  if (!validResult(payload)) return json(response, 400, { error: 'Tên cần 3–12 ký tự A–Z, a–z, 0–9 hoặc _.' });
  return json(response, 201, { entries: addToLeaderboard(payload) });
}

export function gameServer() {
  if (!existsSync(new URL('index.html', dist))) throw new Error('Chạy npm run build trước khi mở game.');
  return createServer(async (request, response) => {
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      if (path === '/api/leaderboard') return await leaderboard(request, response);
      const file = path === '/' ? 'index.html' : path.slice(1);
      if (!files.has(file)) return response.writeHead(404).end();
      if (request.method === 'HEAD') return response.writeHead(200).end();
      if (request.method !== 'GET') return response.writeHead(405).end();
      const stream = createReadStream(new URL(file, dist));
      stream.on('open', () => {
        response.writeHead(200, { 'Content-Type': contentTypes.get(file.split('.').at(-1)) + '; charset=utf-8' });
        stream.pipe(response);
      });
      stream.on('error', error => response.writeHead(error.code === 'ENOENT' ? 404 : 500).end());
      response.on('close', () => stream.destroy());
    } catch (error) {
      console.error(error.message);
      if (!response.headersSent) json(response, 500, { error: 'Không thể đọc hoặc lưu dữ liệu trên đĩa.' });
    }
  });
}
