import { parseArgs } from 'node:util';

export function commandArgs(args, option, integer = false) {
  const normalized = [...args];
  const seedIndex = normalized.indexOf('--seed');
  if (seedIndex !== -1 && /^-\d+$/.test(normalized[seedIndex + 1])) {
    normalized.splice(seedIndex, 2, '--seed=' + normalized[seedIndex + 1]);
  }
  const { values } = parseArgs({
    args: normalized, options: { seed: { type: 'string' }, out: { type: 'string' }, [option]: { type: 'string' } }
  });
  const seed = Number(values.seed);
  const count = Number(values[option]);
  if (!/^[+-]?\d+$/.test(values.seed) || !Number.isSafeInteger(seed) || !Number.isFinite(count)
    || count <= 0 || (integer && !Number.isSafeInteger(count)) || !values.out) {
    throw new Error('--seed <int> --' + option + ' <' + (integer ? 'int' : 'seconds') + '> --out <file.json> được yêu cầu.');
  }
  return { seed, count, out: values.out };
}
