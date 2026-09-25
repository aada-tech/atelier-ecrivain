'use client';

import { auth } from '@/lib/firebase/client';
import type {
  AiErrorBody,
  AiErrorCode,
  AnalyzeRequest,
  AnalyzeResponse,
  CoverRequest,
  CoverResponse,
  FactcheckResponse,
  ResearchRequest,
  ResearchResponse,
  TranscribeResponse,
} from './contracts';

const BYOK_KEY = 'atelier:gemini-key';

export class AiRequestError extends Error {
  constructor(
    public code: AiErrorCode | 'network' | 'offline',
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

/** Clé Gemini personnelle : stockée uniquement sur cet appareil. */
export const personalKey = {
  get(): string {
    try {
      return localStorage.getItem(BYOK_KEY) ?? '';
    } catch {
      return '';
    }
  },
  set(value: string) {
    try {
      if (value) localStorage.setItem(BYOK_KEY, value.trim());
      else localStorage.removeItem(BYOK_KEY);
    } catch {}
  },
};

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new AiRequestError('offline', 'Vous êtes hors ligne : les fonctions IA reviendront avec la connexion.');
  }
  const user = auth().currentUser;
  if (!user) throw new AiRequestError('unauthenticated', 'Connectez-vous pour utiliser l’IA.');
  const token = await user.getIdToken();
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  const key = personalKey.get();
  if (key) headers['x-gemini-key'] = key;
  const isForm = body instanceof FormData;
  if (!isForm) headers['content-type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`/api/ai/${path}`, {
      method: 'POST',
      headers,
      body: isForm ? body : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new AiRequestError('network', 'Connexion au service IA impossible.');
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as AiErrorBody | null;
    throw new AiRequestError(
      data?.error.code ?? 'upstream_error',
      data?.error.message ?? 'Le service IA a rencontré une erreur.',
      data?.error.retryAfter,
    );
  }
  return (await res.json()) as T;
}

export const ai = {
  transcribe(audio: Blob, opts: { context?: string; mode?: 'clean' | 'verbatim' } = {}, signal?: AbortSignal) {
    const form = new FormData();
    form.set('audio', audio, 'dictee');
    if (opts.context) form.set('context', opts.context.slice(-1_400));
    form.set('mode', opts.mode ?? 'clean');
    return post<TranscribeResponse>('transcribe', form, signal);
  },
  analyze(req: AnalyzeRequest, signal?: AbortSignal) {
    return post<AnalyzeResponse>('analyze', req, signal);
  },
  factcheck(text: string, signal?: AbortSignal) {
    return post<FactcheckResponse>('factcheck', { text }, signal);
  },
  research(req: ResearchRequest, signal?: AbortSignal) {
    return post<ResearchResponse>('research', req, signal);
  },
  cover(req: CoverRequest, signal?: AbortSignal) {
    return post<CoverResponse>('cover', req, signal);
  },
};
