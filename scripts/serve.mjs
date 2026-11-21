import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { readLeaderboard } from './leaderboard-file.mjs';
import { gameServer } from './server.mjs';

try {
  const { values } = parseArgs({ options: { 'export-leaderboard': { type: 'string' } } });
  if (values['export-leaderboard'] !== undefined) {
    writeFileSync(values['export-leaderboard'], JSON.stringify({ entries: readLeaderboard() }, null, 2) + '\n', 'utf8');
  } else {
    const port = Number(process.env.PORT ?? 4173);
    const server = gameServer();
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE' ? 'Cổng ' + port + ' đang được dùng. Hãy chọn cổng khác bằng biến PORT.' : error.message);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log('Mở game tại http://127.0.0.1:' + server.address().port + '/');
    });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
