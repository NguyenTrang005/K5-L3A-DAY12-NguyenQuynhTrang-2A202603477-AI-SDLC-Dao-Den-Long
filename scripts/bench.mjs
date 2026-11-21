import { once } from 'node:events';
import { readFileSync, writeFileSync } from 'node:fs';
import { release, type } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { openChrome } from './chrome.mjs';
import { commandArgs } from './runtime-args.mjs';
import { gameServer } from './server.mjs';

async function main() {
  const { seed, count: duration, out } = commandArgs(process.argv.slice(2), 'duration');
  const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
  const server = gameServer().listen(0, '127.0.0.1');
  let browser;
  try {
    await once(server, 'listening');
    browser = await openChrome({
      headless: process.env.LANTERN_BENCH_HEADLESS === '1',
      software: process.env.LANTERN_BENCH_SOFTWARE === '1',
      uncapped: true
    });
    const url = 'http://127.0.0.1:' + server.address().port + '/web/benchmark.html?'
      + new URLSearchParams({ seed: String(seed), duration: String(duration) });
    await browser.call('Page.navigate', { url });
    const version = await browser.call('Browser.getVersion');
    const expire = performance.now() + (duration + 20) * 1000;
    let measured;
    while (performance.now() < expire) {
      const reply = await browser.call('Runtime.evaluate', {
        expression: '({ result: window.benchmarkResult, error: window.benchmarkError })', returnByValue: true
      });
      const { result, error } = reply.result?.value ?? {};
      if (error) throw new Error(error);
      if (result) { measured = result; break; }
      await delay(120);
    }
    if (!measured) throw new Error('Hết giờ chờ kết quả benchmark.');
    const { firstFrameEpoch, mode, gpu, ...metrics } = measured;
    const data = {
      contract_version: contract.contract_version,
      ...metrics,
      load_ms: Math.max(0, Math.round(firstFrameEpoch - performance.timeOrigin)),
      peak_mem_mb: null,
      vsync_off: false,
      renderer: mode + ' / ' + version.product + ' / ' + gpu,
      os: type() + ' ' + release()
    };
    writeFileSync(out, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(data, null, 2));
  } finally {
    if (browser) await browser.close();
    server.close();
    server.closeAllConnections();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
