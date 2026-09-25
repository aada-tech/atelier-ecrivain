'use client';

import { deleteDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { refs } from './refs';
import type { Chapter, DocNode, Note } from '@/lib/doc/types';
import { normalizeDoc } from '@/lib/doc/text';
import { sanitizeNotes, toMillis } from '@/lib/doc/legacy';
import { createId } from '@/lib/utils';

export interface Snapshot {
  id: string;
  chapterId: string;
  title: string;
  label: string;
  doc: DocNode;
  notes: Note[];
  wordCount: number;
  createdAt: number;
  auto: boolean;
}

const MAX_PER_CHAPTER = 25;

export async function createSnapshot(uid: string, mid: string, chapter: Chapter, label: string, auto = false) {
  const sid = createId('v');
  await setDoc(refs.snapshot(uid, mid, sid), {
    chapterId: chapter.id,
    title: chapter.title,
    label: label.slice(0, 120),
    doc: chapter.doc,
    notes: chapter.notes,
    wordCount: chapter.wordCount,
    auto,
    createdAt: serverTimestamp(),
  });
  void pruneSnapshots(uid, mid, chapter.id).catch(() => {});
  return sid;
}

export async function listSnapshots(uid: string, mid: string, chapterId: string): Promise<Snapshot[]> {
  const snap = await getDocs(query(refs.snapshots(uid, mid), where('chapterId', '==', chapterId)));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        chapterId,
        title: String(data.title ?? ''),
        label: String(data.label ?? ''),
        doc: normalizeDoc(data.doc),
        notes: sanitizeNotes(data.notes),
        wordCount: typeof data.wordCount === 'number' ? data.wordCount : 0,
        createdAt: toMillis(data.createdAt) || Date.now(),
        auto: Boolean(data.auto),
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Instantanés de chapitres supprimés (corbeille du manuscrit). */
export async function listDeletedChapterSnapshots(uid: string, mid: string, liveChapterIds: Set<string>): Promise<Snapshot[]> {
  const snap = await getDocs(refs.snapshots(uid, mid));
  const latest = new Map<string, Snapshot>();
  for (const d of snap.docs) {
    const data = d.data();
    const chapterId = String(data.chapterId ?? '');
    if (!chapterId || liveChapterIds.has(chapterId)) continue;
    const s: Snapshot = {
      id: d.id,
      chapterId,
      title: String(data.title ?? ''),
      label: String(data.label ?? ''),
      doc: normalizeDoc(data.doc),
      notes: sanitizeNotes(data.notes),
      wordCount: typeof data.wordCount === 'number' ? data.wordCount : 0,
      createdAt: toMillis(data.createdAt) || Date.now(),
      auto: Boolean(data.auto),
    };
    const prev = latest.get(chapterId);
    if (!prev || prev.createdAt < s.createdAt) latest.set(chapterId, s);
  }
  return [...latest.values()].sort((a, b) => b.createdAt - a.createdAt);
}

async function pruneSnapshots(uid: string, mid: string, chapterId: string) {
  const list = await listSnapshots(uid, mid, chapterId);
  const autos = list.filter((s) => s.auto);
  const excess = list.length - MAX_PER_CHAPTER;
  if (excess <= 0) return;
  // On supprime d'abord les instantanés automatiques les plus anciens.
  const victims = [...autos.reverse(), ...list.filter((s) => !s.auto).reverse()].slice(0, excess);
  await Promise.all(victims.map((s) => deleteDoc(refs.snapshot(uid, mid, s.id))));
}

export async function deleteSnapshot(uid: string, mid: string, sid: string) {
  await deleteDoc(refs.snapshot(uid, mid, sid));
}
