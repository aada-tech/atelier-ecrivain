import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT, generateKeyPair, type CryptoKey } from 'jose';
import { AuthError, bearerToken, verifyFirebaseToken } from '@/server/auth';
import { __resetRateLimits, checkRateLimit, rateConfig } from '@/server/rate-limit';
import { modelChain, parseJsonLoose, salvageText } from '@/server/gemini';
import { detectAudioMime } from '@/server/audio';

const PROJECT = 'demo-atelier';

describe('verifyFirebaseToken', () => {
  let privateKey: CryptoKey;
  let publicKey: CryptoKey;
  beforeAll(async () => {
    ({ privateKey, publicKey } = await generateKeyPair('RS256'));
  });

  const sign = (claims: Record<string, unknown> = {}, opts: { aud?: string; iss?: string; exp?: string; sub?: string } = {}) =>
    new SignJWT({ firebase: { sign_in_provider: 'google.com' }, ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer(opts.iss ?? `https://securetoken.google.com/${PROJECT}`)
      .setAudience(opts.aud ?? PROJECT)
      .setSubject(opts.sub ?? 'user-1')
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? '1h')
      .sign(privateKey);

  it('accepte un jeton valide et reconnaît les sessions anonymes', async () => {
    await expect(verifyFirebaseToken(await sign(), PROJECT, publicKey)).resolves.toEqual({ uid: 'user-1', anonymous: false });
    const anon = await sign({ firebase: { sign_in_provider: 'anonymous' } });
    await expect(verifyFirebaseToken(anon, PROJECT, publicKey)).resolves.toMatchObject({ anonymous: true });
  });

  it('refuse une autre audience, un autre émetteur ou un jeton expiré', async () => {
    await expect(verifyFirebaseToken(await sign({}, { aud: 'autre-projet' }), PROJECT, publicKey)).rejects.toBeInstanceOf(AuthError);
    await expect(verifyFirebaseToken(await sign({}, { iss: 'https://evil.example' }), PROJECT, publicKey)).rejects.toBeInstanceOf(
      AuthError,
    );
    await expect(verifyFirebaseToken(await sign({}, { exp: '-10m' }), PROJECT, publicKey)).rejects.toBeInstanceOf(AuthError);
  });

  it('refuse une signature d’une autre clé ou un algorithme symétrique', async () => {
    const other = await generateKeyPair('RS256');
    await expect(verifyFirebaseToken(await sign(), PROJECT, other.publicKey)).rejects.toBeInstanceOf(AuthError);
    const hs = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(`https://securetoken.google.com/${PROJECT}`)
      .setAudience(PROJECT)
      .setSubject('x')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('secret-secret-secret-secret-secret'));
    await expect(verifyFirebaseToken(hs, PROJECT, publicKey)).rejects.toBeInstanceOf(AuthError);
  });

  it('refuse l’absence de jeton ou de projet', async () => {
    await expect(verifyFirebaseToken('', PROJECT, publicKey)).rejects.toBeInstanceOf(AuthError);
    await expect(verifyFirebaseToken('x', '', publicKey)).rejects.toBeInstanceOf(AuthError);
  });

  it('lit l’en-tête Authorization', () => {
    expect(bearerToken(new Request('http://x', { headers: { authorization: 'Bearer  abc ' } }))).toBe('abc');
    expect(bearerToken(new Request('http://x', { headers: { authorization: 'Basic abc' } }))).toBe('');
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => __resetRateLimits());
  const cfg = { perMinute: 3, perDay: 5 };
  const t0 = Date.UTC(2026, 0, 1, 12);

  it('limite les rafales puis libère après une minute', () => {
    expect(checkRateLimit('u', 2, cfg, t0).ok).toBe(true);
    expect(checkRateLimit('u', 1, cfg, t0 + 1_000).ok).toBe(true);
    const blocked = checkRateLimit('u', 1, cfg, t0 + 2_000);
    expect(blocked).toMatchObject({ ok: false, remainingToday: 2 });
    expect(blocked.retryAfter).toBe(58);
    expect(checkRateLimit('u', 1, cfg, t0 + 61_000).ok).toBe(true);
  });

  it('applique le quota journalier et le réinitialise à minuit UTC', () => {
    for (let i = 0; i < 5; i++) expect(checkRateLimit('u', 1, cfg, t0 + i * 61_000).ok).toBe(true);
    const blocked = checkRateLimit('u', 1, cfg, t0 + 10 * 61_000);
    expect(blocked).toMatchObject({ ok: false, remainingToday: 0 });
    expect(checkRateLimit('u', 1, cfg, Date.UTC(2026, 0, 2, 0, 0, 1)).ok).toBe(true);
  });

  it('cloisonne les utilisateurs', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', 1, cfg, t0);
    expect(checkRateLimit('a', 1, cfg, t0).ok).toBe(false);
    expect(checkRateLimit('b', 1, cfg, t0).ok).toBe(true);
  });

  it('réserve un quota plus bas aux sessions anonymes', () => {
    expect(rateConfig(true).perDay).toBeLessThan(rateConfig(false).perDay);
  });
});

describe('gemini', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('lit la chaîne de modèles depuis l’environnement en filtrant les valeurs douteuses', () => {
    vi.stubEnv('AI_MODELS_TEXT', ' modele-a , ../evil, modele-b?x=1,gemini-9 ');
    expect(modelChain('text')).toEqual(['modele-a', 'gemini-9']);
    vi.stubEnv('AI_MODELS_TEXT', '');
    expect(modelChain('text').length).toBeGreaterThan(0);
  });

  it('parseJsonLoose extrait le JSON d’une réponse bavarde', () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('Voici : [1,2] fin')).toEqual([1, 2]);
    expect(() => parseJsonLoose('rien')).toThrow();
  });

  it('salvageText récupère le texte d’un JSON tronqué', () => {
    expect(salvageText('{"text":"Bonjour\\n« toi »","revisions":[')).toBe('Bonjour\n« toi »');
    expect(salvageText('Texte brut')).toBe('Texte brut');
    expect(salvageText('{"autre":1')).toBe('');
  });
});

describe('detectAudioMime', () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(12).fill(0)]);
  it('reconnaît les signatures binaires', () => {
    expect(detectAudioMime(bytes(0x1a, 0x45, 0xdf, 0xa3))).toBe('audio/webm');
    expect(detectAudioMime(bytes(0x4f, 0x67, 0x67, 0x53))).toBe('audio/ogg');
    expect(detectAudioMime(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70), 'video/mp4')).toBe('audio/mp4');
    expect(detectAudioMime(bytes(0x49, 0x44, 0x33))).toBe('audio/mpeg');
  });
  it('se rabat sur le type déclaré puis sur un type neutre', () => {
    expect(detectAudioMime(new Uint8Array(2), 'audio/webm;codecs=opus')).toBe('audio/webm');
    expect(detectAudioMime(new Uint8Array(2), 'text/html')).toBe('application/octet-stream');
  });
});
