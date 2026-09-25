import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/auth')>();
  return {
    ...actual,
    verifyFirebaseToken: vi.fn(async (token: string) => {
      if (token === 'ok') return { uid: 'u1', anonymous: false };
      if (token === 'anon') return { uid: 'u2', anonymous: true };
      throw new actual.AuthError('invalide');
    }),
  };
});

const { guard, isResponse } = await import('@/server/handler');
const { __resetRateLimits } = await import('@/server/rate-limit');

const KEY = 'AIza' + 'x'.repeat(35);

function request(headers: Record<string, string>) {
  return new Request('https://atelier.test/api/ai/analyze', { method: 'POST', headers: { host: 'atelier.test', ...headers } });
}

async function status(res: unknown) {
  return isResponse(res) ? { status: res.status, body: await res.json() } : { status: 200, body: res };
}

describe('guard (routes IA)', () => {
  beforeEach(() => {
    __resetRateLimits();
    vi.stubEnv('GEMINI_API_KEY', KEY);
    vi.stubEnv('AI_RATE_PER_MINUTE', '2');
    vi.stubEnv('AI_RATE_PER_DAY', '3');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('exige un jeton Firebase', async () => {
    expect((await status(await guard(request({})))).status).toBe(401);
    expect((await status(await guard(request({ authorization: 'Bearer faux' })))).status).toBe(401);
  });

  it('refuse les appels d’une autre origine', async () => {
    const res = await guard(request({ authorization: 'Bearer ok', origin: 'https://evil.example' }));
    expect((await status(res)).status).toBe(403);
  });

  it('accepte un appel authentifié de même origine avec la clé serveur', async () => {
    const res = await guard(request({ authorization: 'Bearer ok', origin: 'https://atelier.test' }));
    expect(isResponse(res)).toBe(false);
    expect(res).toMatchObject({ user: { uid: 'u1' }, apiKey: KEY });
  });

  it('refuse une clé personnelle malformée au lieu de consommer la clé serveur sans quota', async () => {
    const res = await guard(request({ authorization: 'Bearer ok', 'x-gemini-key': 'nope' }));
    expect((await status(res)).status).toBe(400);
  });

  it('utilise la clé personnelle sans quota journalier, mais avec l’anti-rafale', async () => {
    const own = 'AIza' + 'y'.repeat(35);
    const h = { authorization: 'Bearer ok', 'x-gemini-key': own };
    expect(await guard(request(h))).toMatchObject({ apiKey: own });
    expect(isResponse(await guard(request(h)))).toBe(false);
    expect((await status(await guard(request(h)))).status).toBe(429);
  });

  it('applique le quota journalier avec la clé serveur', async () => {
    const h = { authorization: 'Bearer ok' };
    const t = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(t);
    await guard(request(h));
    await guard(request(h));
    vi.spyOn(Date, 'now').mockReturnValue(t + 61_000);
    await guard(request(h));
    const blocked = await status(await guard(request(h)));
    vi.restoreAllMocks();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('rate_limited');
  });

  it('signale l’absence de clé serveur', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const res = await status(await guard(request({ authorization: 'Bearer ok' })));
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('no_key');
  });
});
