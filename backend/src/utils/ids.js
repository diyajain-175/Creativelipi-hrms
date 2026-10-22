export function nextId(prefix, existing) {
  const nums = existing
    .map((item) => Number(String(item.id).replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `${prefix}-${max + 1}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}
