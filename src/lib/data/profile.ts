'use client';

import { onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { refs } from './refs';
import { toMillis } from '@/lib/doc/legacy';

export type DictationEngine = 'auto' | 'browser' | 'cloud';

export interface Profile {
  penName: string;
  avatarColor: string;
  avatarUrl: string;
  lastManuscriptId?: string;
  /** Consentement explicite au traitement IA (texte/audio envoyés à Google Gemini). */
  aiConsent: { version: number; acceptedAt: number } | null;
  dailyGoal: number;
  dictationEngine: DictationEngine;
  createdAt: number;
}

/** Incrémenter si la finalité ou les sous-traitants IA changent : le consentement sera redemandé. */
export const AI_CONSENT_VERSION = 1;

export const DEFAULT_PROFILE: Profile = {
  penName: '',
  avatarColor: '#f2542d',
  avatarUrl: '',
  aiConsent: null,
  dailyGoal: 500,
  dictationEngine: 'auto',
  createdAt: 0,
};

export function profileFromData(data: Record<string, unknown> | undefined): Profile {
  if (!data) return { ...DEFAULT_PROFILE };
  const consent = data.aiConsent as { version?: unknown; acceptedAt?: unknown } | null | undefined;
  return {
    penName: typeof data.penName === 'string' ? data.penName : '',
    avatarColor:
      typeof data.avatarColor === 'string' && /^#[0-9a-f]{6}$/i.test(data.avatarColor) ? data.avatarColor : DEFAULT_PROFILE.avatarColor,
    avatarUrl: typeof data.avatarUrl === 'string' && data.avatarUrl.startsWith('data:image/') ? data.avatarUrl : '',
    lastManuscriptId:
      typeof data.lastManuscriptId === 'string'
        ? data.lastManuscriptId
        : typeof data.lastActiveManuscriptId === 'string'
          ? data.lastActiveManuscriptId
          : undefined,
    aiConsent:
      consent && typeof consent.version === 'number' ? { version: consent.version, acceptedAt: toMillis(consent.acceptedAt) } : null,
    dailyGoal: typeof data.dailyGoal === 'number' && data.dailyGoal > 0 ? Math.min(20000, data.dailyGoal) : DEFAULT_PROFILE.dailyGoal,
    dictationEngine: data.dictationEngine === 'browser' || data.dictationEngine === 'cloud' ? data.dictationEngine : 'auto',
    createdAt: toMillis(data.createdAt),
  };
}

export function subscribeProfile(uid: string, cb: (p: Profile, exists: boolean) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    refs.profile(uid),
    (snap) => cb(profileFromData(snap.data()), snap.exists()),
    (err) => onError?.(err),
  );
}

export async function updateProfile(uid: string, patch: Partial<Profile>) {
  const data: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  if (patch.aiConsent) data.aiConsent = { version: patch.aiConsent.version, acceptedAt: serverTimestamp() };
  await setDoc(refs.profile(uid), data, { merge: true });
}

export async function ensureProfile(uid: string, penName: string) {
  await setDoc(
    refs.profile(uid),
    { penName, dailyGoal: DEFAULT_PROFILE.dailyGoal, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}
