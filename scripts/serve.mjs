import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';

const dist = new URL('../dist/', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/web/style.css', ['web/style.css', 'text/css']],
  ['/web/client.mjs', ['web/client.mjs', 'text/javascript']],
  ['/web/renderer.mjs', ['web/renderer.mjs', 'text/javascript']],
  ['/src/game.mjs', ['src/game.mjs', 'text/javascript']],
  ['/game.contract.json', ['game.contract.json', 'application/json']]
]);

if (!existsSync(new URL('index.html', dist))) {
  console.error('Chạy npm run build trước khi mở game.');
  process.exit(1);
}

const server = createServer((request, response) => {
  const entry = files.get(new URL(request.url, 'http://localhost').pathname);
  if (!entry) {
    response.writeHead(404).end();
    return;
  }
  const [file, type] = entry;
  const stream = createReadStream(new URL(file, dist));
  stream.on('open', () => {
    response.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
    stream.pipe(response);
  });
  stream.on('error', () => response.writeHead(500).end());
});

server.listen(Number(process.env.PORT ?? 4173), '127.0.0.1', () => {
  console.log('Mở game tại http://127.0.0.1:' + server.address().port + '/');
});
