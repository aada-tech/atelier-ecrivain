import 'server-only';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * Vérification d'un ID token Firebase sans SDK Admin ni compte de service :
 * signature RS256 contre les clés publiques de securetoken, émetteur et
 * audience liés au projet. Aucun secret n'est nécessaire.
 */
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
  { cooldownDuration: 60_000, cacheMaxAge: 6 * 60 * 60 * 1000 },
);

export interface VerifiedUser {
  uid: string;
  anonymous: boolean;
}

interface FirebaseClaims extends JWTPayload {
  firebase?: { sign_in_provider?: string };
}

export class AuthError extends Error {}

export async function verifyFirebaseToken(
  token: string,
  projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  keySet: Parameters<typeof jwtVerify>[1] = JWKS,
): Promise<VerifiedUser> {
  if (!projectId) throw new AuthError('Projet Firebase non configuré');
  if (!token || token.length > 4096) throw new AuthError('Jeton absent');
  try {
    const { payload } = await jwtVerify<FirebaseClaims>(token, keySet as never, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
      clockTolerance: 30,
    });
    if (!payload.sub || payload.sub.length > 128) throw new AuthError('Sujet invalide');
    return { uid: payload.sub, anonymous: payload.firebase?.sign_in_provider === 'anonymous' };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError('Jeton invalide ou expiré');
  }
}

export function bearerToken(req: Request): string {
  const header = req.headers.get('authorization') ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}
