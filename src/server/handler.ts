import 'server-only';
import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import type { AiErrorBody, AiErrorCode } from '@/lib/ai/contracts';
import { AuthError, bearerToken, verifyFirebaseToken, type VerifiedUser } from './auth';
import { checkRateLimit, rateConfig } from './rate-limit';
import { UpstreamError } from './gemini';

export function aiError(code: AiErrorCode, message: string, status: number, retryAfter?: number) {
  const body: AiErrorBody = { error: { code, message, ...(retryAfter ? { retryAfter } : {}) } };
  return NextResponse.json(body, {
    status,
    headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
  });
}

const KEY_RE = /^[A-Za-z0-9_\-]{20,120}$/;

export interface AiContext {
  user: VerifiedUser;
  apiKey: string;
}

/**
 * Garde commune des routes IA : origine, authentification, clé, débit.
 * `cost` pondère les opérations coûteuses (audio, image).
 */
export async function guard(req: Request, cost = 1): Promise<AiContext | NextResponse> {
  const origin = req.headers.get('origin');
  if (origin) {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    try {
      if (!host || new URL(origin).host !== host) return aiError('bad_request', 'Origine non autorisée.', 403);
    } catch {
      return aiError('bad_request', 'Origine non autorisée.', 403);
    }
  }

  let user: VerifiedUser;
  try {
    user = await verifyFirebaseToken(bearerToken(req));
  } catch (err) {
    return aiError(
      'unauthenticated',
      err instanceof AuthError ? 'Session expirée, reconnectez-vous.' : 'Authentification impossible.',
      401,
    );
  }

  // Clé personnelle (optionnelle) : utilisée pour cette seule requête, jamais stockée ni journalisée.
  const userKey = req.headers.get('x-gemini-key')?.trim();
  const apiKey = userKey && KEY_RE.test(userKey) ? userKey : (process.env.GEMINI_API_KEY ?? '');
  if (!apiKey) {
    return aiError('no_key', 'Aucune clé Gemini n’est configurée sur le serveur. Ajoutez votre propre clé dans Compte › IA.', 503);
  }

  // Une clé personnelle n'est pas soumise au quota du service, seulement à l'anti-rafale.
  const cfg = rateConfig(user.anonymous);
  const limit = checkRateLimit(user.uid, cost, userKey ? { ...cfg, perDay: Number.MAX_SAFE_INTEGER } : cfg);
  if (!limit.ok) {
    return aiError(
      'rate_limited',
      limit.remainingToday === 0
        ? 'Quota IA du jour atteint. Il se réinitialise à minuit (UTC).'
        : 'Trop de requêtes rapprochées. Patientez quelques secondes.',
      429,
      limit.retryAfter,
    );
  }
  return { user, apiKey };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>, maxBytes = 64_000): Promise<T | NextResponse> {
  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > maxBytes) return aiError('payload_too_large', 'Texte trop long pour une seule analyse.', 413);
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return aiError('payload_too_large', 'Texte trop long pour une seule analyse.', 413);
    raw = JSON.parse(text);
  } catch {
    return aiError('bad_request', 'Requête invalide.', 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return aiError('bad_request', 'Paramètres invalides.', 400);
  return parsed.data;
}

export function upstreamFailure(err: unknown) {
  if (err instanceof UpstreamError) {
    if (err.kind === 'quota')
      return aiError('upstream_quota', 'Le service IA est saturé pour le moment. Réessayez dans une minute.', 503, 60);
    if (err.kind === 'blocked') return aiError('upstream_blocked', 'Le fournisseur IA a refusé de traiter ce passage.', 422);
    if (err.kind === 'auth') return aiError('no_key', 'La clé Gemini est invalide ou non autorisée.', 503);
  }
  console.error('[ai] échec amont', err instanceof Error ? err.message : 'inconnu');
  return aiError('upstream_error', 'Le service IA est momentanément indisponible.', 502);
}

export function isResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse || v instanceof Response;
}
