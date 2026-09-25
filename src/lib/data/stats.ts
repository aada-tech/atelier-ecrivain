'use client';

import { documentId, increment, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { refs } from './refs';
import { dayKey } from '@/lib/utils';

export interface DayStat {
  day: string;
  words: number;
}

/** Ajoute des mots écrits aujourd'hui (seuls les ajouts nets positifs comptent). */
export async function recordWords(uid: string, delta: number) {
  if (!Number.isFinite(delta) || delta <= 0) return;
  await setDoc(
    refs.stat(uid, dayKey()),
    { words: increment(Math.min(delta, 20_000)), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function subscribeRecentStats(uid: string, days: number, cb: (stats: DayStat[]) => void) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return onSnapshot(
    query(refs.stats(uid), where(documentId(), '>=', dayKey(start))),
    (snap) => cb(snap.docs.map((d) => ({ day: d.id, words: Number(d.data().words) || 0 }))),
    () => cb([]),
  );
}

/** Série de jours consécutifs (jusqu'à aujourd'hui ou hier) ayant au moins 1 mot. */
export function computeStreak(stats: DayStat[], today = new Date()): number {
  const byDay = new Map(stats.map((s) => [s.day, s.words]));
  const cursor = new Date(today);
  if (!byDay.get(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while ((byDay.get(dayKey(cursor)) ?? 0) > 0) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
