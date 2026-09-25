'use client';

import {
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import { refs, SESSION_ID } from './refs';
import type { DocNode, Manuscript } from '@/lib/doc/types';
import { CURRENT_SCHEMA, EMPTY_DOC } from '@/lib/doc/types';
import { toMillis } from '@/lib/doc/legacy';
import { docWordCount } from '@/lib/doc/text';
import { createId } from '@/lib/utils';

export const MANUSCRIPT_ACCENTS = ['#f2542d', '#6a5cf5', '#1b8a5e', '#d4a017', '#2b6cb0', '#b83280', '#17151f'];

export function manuscriptFromData(id: string, data: Record<string, unknown>): Manuscript {
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Sans titre';
  return {
    id,
    title,
    subtitle: typeof data.subtitle === 'string' ? data.subtitle : undefined,
    genre: typeof data.genre === 'string' ? data.genre : undefined,
    accent: typeof data.accent === 'string' ? data.accent : undefined,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt) || toMillis(data.createdAt),
    wordCount: typeof data.wordCount === 'number' ? data.wordCount : 0,
    chapterCount:
      typeof data.chapterCount === 'number'
        ? data.chapterCount
        : typeof data.chaptersCount === 'number'
          ? data.chaptersCount
          : 0,
    goal:
      data.goal && typeof data.goal === 'object'
        ? {
            targetWords: typeof (data.goal as Record<string, unknown>).targetWords === 'number'
              ? ((data.goal as Record<string, unknown>).targetWords as number)
              : undefined,
            deadline: typeof (data.goal as Record<string, unknown>).deadline === 'string'
              ? ((data.goal as Record<string, unknown>).deadline as string)
              : undefined,
          }
        : undefined,
  };
}

export function subscribeManuscripts(uid: string, cb: (list: Manuscript[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    refs.manuscripts(uid),
    (snap) => {
      const list = snap.docs.map((d) => manuscriptFromData(d.id, d.data()));
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      cb(list);
    },
    (err) => onError?.(err),
  );
}

export interface NewManuscriptInput {
  title: string;
  subtitle?: string;
  genre?: string;
  accent?: string;
  targetWords?: number;
  /** Contenu du premier chapitre (modèle, import). */
  chapters?: { title: string; doc: DocNode }[];
}

export async function createManuscript(uid: string, input: NewManuscriptInput): Promise<string> {
  const db = firestore();
  const mid = createId('m');
  const batch = writeBatch(db);
  const chapters = input.chapters?.length ? input.chapters : [{ title: 'Chapitre 1', doc: EMPTY_DOC }];
  const words = chapters.reduce((s, c) => s + docWordCount(c.doc), 0);
  batch.set(refs.manuscript(uid, mid), {
    title: input.title.trim().slice(0, 200) || 'Sans titre',
    subtitle: input.subtitle?.trim().slice(0, 300) || null,
    genre: input.genre ?? null,
    accent: input.accent ?? MANUSCRIPT_ACCENTS[Math.floor(Math.random() * MANUSCRIPT_ACCENTS.length)],
    goal: input.targetWords ? { targetWords: input.targetWords } : null,
    wordCount: words,
    chapterCount: chapters.length,
    schema: CURRENT_SCHEMA,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  chapters.forEach((c, i) => {
    batch.set(refs.chapter(uid, mid, createId('c')), {
      title: c.title,
      order: i,
      status: 'draft',
      doc: c.doc,
      notes: [],
      suggestions: [],
      wordCount: docWordCount(c.doc),
      schema: CURRENT_SCHEMA,
      updatedAt: serverTimestamp(),
      updatedBy: SESSION_ID,
    });
  });
  await batch.commit();
  return mid;
}

export async function updateManuscript(
  uid: string,
  mid: string,
  patch: Partial<Pick<Manuscript, 'title' | 'subtitle' | 'genre' | 'accent' | 'goal' | 'wordCount' | 'chapterCount'>>,
) {
  await setDoc(refs.manuscript(uid, mid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

async function deleteAll(refsToDelete: DocumentReference[]) {
  const db = firestore();
  for (let i = 0; i < refsToDelete.length; i += 400) {
    const batch = writeBatch(db);
    refsToDelete.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

/** Supprime un manuscrit et toutes ses sous-collections connues. */
export async function deleteManuscript(uid: string, mid: string) {
  const [chapters, meta, snaps] = await Promise.all([
    getDocs(refs.chapters(uid, mid)),
    getDocs(refs.metaCol(uid, mid)),
    getDocs(refs.snapshots(uid, mid)),
  ]);
  await deleteAll([
    ...chapters.docs.map((d) => d.ref),
    ...meta.docs.map((d) => d.ref),
    ...snaps.docs.map((d) => d.ref),
    refs.manuscript(uid, mid),
  ]);
}

export { deleteAll };
