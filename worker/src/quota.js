const SECONDS_IN_A_DAY = 60 * 60 * 24;

export async function checkAndConsumeQuota(kv, uid, dayKey, limit) {
  const key = `quota:${uid}:${dayKey}`;
  const current = Number((await kv.get(key)) ?? '0');

  if (current >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const next = current + 1;
  await kv.put(key, String(next), { expirationTtl: SECONDS_IN_A_DAY });
  return { allowed: true, remaining: limit - next };
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
