import 'server-only';

/**
 * Limiteur par utilisateur (fenêtre glissante d'une minute + quota journalier).
 *
 * Stocké en mémoire de l'instance : suffisant pour contenir les abus d'un
 * compte sur une instance chaude. Pour une limite stricte multi-instances,
 * brancher un stockage partagé (Upstash/Redis) derrière la même interface.
 */
interface Bucket {
  minute: number[];
  day: string;
  dayCount: number;
}

const store: Map<string, Bucket> = ((globalThis as Record<string, unknown>).__atelierRate as Map<string, Bucket>) ?? new Map();
(globalThis as Record<string, unknown>).__atelierRate = store;

export interface RateLimitConfig {
  perMinute: number;
  perDay: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number;
  remainingToday: number;
}

function today(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

export function checkRateLimit(key: string, cost: number, cfg: RateLimitConfig, now = Date.now()): RateLimitResult {
  let bucket = store.get(key);
  if (!bucket || bucket.day !== today(now)) {
    bucket = { minute: [], day: today(now), dayCount: 0 };
    store.set(key, bucket);
  }
  bucket.minute = bucket.minute.filter((t) => t > now - 60_000);

  if (bucket.dayCount + cost > cfg.perDay) {
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return { ok: false, retryAfter: Math.ceil((midnight.getTime() - now) / 1000), remainingToday: 0 };
  }
  if (bucket.minute.length + cost > cfg.perMinute) {
    const oldest = bucket.minute[0] ?? now;
    return { ok: false, retryAfter: Math.max(1, Math.ceil((oldest + 60_000 - now) / 1000)), remainingToday: cfg.perDay - bucket.dayCount };
  }
  for (let i = 0; i < cost; i++) bucket.minute.push(now);
  bucket.dayCount += cost;

  // Nettoyage opportuniste pour borner la mémoire.
  if (store.size > 5_000) {
    for (const [k, b] of store) if (b.day !== bucket.day) store.delete(k);
  }
  return { ok: true, remainingToday: cfg.perDay - bucket.dayCount };
}

export function rateConfig(anonymous: boolean): RateLimitConfig {
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  return {
    perMinute: num(process.env.AI_RATE_PER_MINUTE, 12),
    perDay: anonymous ? num(process.env.AI_RATE_PER_DAY_ANONYMOUS, 30) : num(process.env.AI_RATE_PER_DAY, 300),
  };
}

export function __resetRateLimits() {
  store.clear();
}
