const namePattern = /^[A-Za-z0-9_]{3,12}$/;
const datePattern = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/;

export const validName = name => typeof name === 'string' && namePattern.test(name);
export const validResult = entry => entry && validName(entry.name)
  && Number.isSafeInteger(entry.score) && entry.score >= 0
  && Number.isInteger(entry.nights_won) && entry.nights_won >= 0 && entry.nights_won <= 3
  && Number.isSafeInteger(entry.seed);

export function topEntries(entries) {
  return entries.filter(entry => validResult(entry) && typeof entry.achieved_at === 'string'
    && datePattern.test(entry.achieved_at) && Number.isFinite(Date.parse(entry.achieved_at)))
    .map(({ name, score, nights_won, achieved_at, seed }) => ({ name, score, nights_won, achieved_at, seed }))
    .sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at))
    .slice(0, 10);
}

export function recordResult(entries, result, date = new Date()) {
  if (!validResult(result)) throw new TypeError('Tên cần 3–12 ký tự A–Z, a–z, 0–9 hoặc _.');
  const { name, score, nights_won, seed } = result;
  return topEntries([...entries, { name, score, nights_won, seed, achieved_at: date.toISOString() }]);
}
