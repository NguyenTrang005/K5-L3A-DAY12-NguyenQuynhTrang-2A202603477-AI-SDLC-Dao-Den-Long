import { execFile } from 'node:child_process';
import { copyFile, cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const name = 'dao-den-long-v' + version;
const output = join(root, 'dist', name + '.tar.gz');
await execute(process.execPath, ['scripts/build.mjs'], { cwd: root });
const staging = await mkdtemp(join(tmpdir(), 'lantern-release-'));
const release = join(staging, name);
try {
  const entries = [
    ['dist/index.html', 'dist/index.html'], ['dist/game.contract.json', 'dist/game.contract.json'],
    ['src/leaderboard.mjs', 'src/leaderboard.mjs'], ['LICENSE', 'LICENSE'], ['CREDITS.md', 'CREDITS.md'],
    ['docs/play-release.md', 'README.md'],
    ...['serve.mjs', 'server.mjs', 'leaderboard-file.mjs'].map(file => ['scripts/' + file, 'scripts/' + file])
  ];
  for (const [source, target] of entries) {
    const destination = join(release, target);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(root, source), destination);
  }
  for (const directory of ['dist/src', 'dist/web']) {
    await cp(join(root, directory), join(release, directory), { recursive: true });
  }
  const archive = name + '.tar.gz';
  await execute('tar', ['-czf', archive, name], { cwd: staging });
  await copyFile(join(staging, archive), output);
  console.log(output);
} finally {
  await rm(staging, { recursive: true, force: true });
}
