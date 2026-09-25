'use client';

import {
  deleteDoc,
  deleteField,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import { refs, SESSION_ID } from './refs';
import { chapterFromFirestore } from '@/lib/doc/legacy';
import type { Chapter } from '@/lib/doc/types';
import { CURRENT_SCHEMA, EMPTY_DOC } from '@/lib/doc/types';
import { createId } from '@/lib/utils';

export interface ChaptersSnapshot {
  chapters: Chapter[];
  fromCache: boolean;
  hasPendingWrites: boolean;
  /** Identifiants des chapitres modifiés par un AUTRE appareil/onglet dans ce lot. */
  remoteChanged: Set<string>;
}

export function subscribeChapters(
  uid: string,
  mid: string,
  cb: (s: ChaptersSnapshot) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    refs.chapters(uid, mid),
    { includeMetadataChanges: true },
    (snap) => {
      const chapters = snap.docs.map((d, i) => chapterFromFirestore(d.id, d.data(), i));
      chapters.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      const remoteChanged = new Set<string>();
      for (const change of snap.docChanges()) {
        const data = change.doc.data();
        if (change.type !== 'removed' && !change.doc.metadata.hasPendingWrites && data.updatedBy !== SESSION_ID) {
          remoteChanged.add(change.doc.id);
        }
      }
      cb({
        chapters,
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
        remoteChanged,
      });
    },
    (err) => onError?.(err),
  );
}

type ChapterPatch = Partial<Pick<Chapter, 'title' | 'order' | 'status' | 'doc' | 'notes' | 'suggestions' | 'wordCount'>>;

/**
 * Écrit un chapitre. La promesse se résout quand le serveur a confirmé ;
 * l'écriture locale (cache IndexedDB) est, elle, immédiate.
 */
export async function saveChapter(uid: string, mid: string, cid: string, patch: ChapterPatch) {
  const data: Record<string, unknown> = {
    ...patch,
    schema: CURRENT_SCHEMA,
    updatedAt: serverTimestamp(),
    updatedBy: SESSION_ID,
  };
  if (patch.doc) {
    // Nettoie les champs de la v1 dès la première sauvegarde migrée.
    data.blocks = deleteField();
    data.paragraphs = deleteField();
    data.pendingReviews = deleteField();
  }
  await setDoc(refs.chapter(uid, mid, cid), data, { merge: true });
}

export async function createChapter(uid: string, mid: string, title: string, order: number): Promise<string> {
  const cid = createId('c');
  await setDoc(refs.chapter(uid, mid, cid), {
    title,
    order,
    status: 'draft',
    doc: EMPTY_DOC,
    notes: [],
    suggestions: [],
    wordCount: 0,
    schema: CURRENT_SCHEMA,
    updatedAt: serverTimestamp(),
    updatedBy: SESSION_ID,
  });
  return cid;
}

export async function deleteChapter(uid: string, mid: string, cid: string) {
  await deleteDoc(refs.chapter(uid, mid, cid));
}

export async function reorderChapters(uid: string, mid: string, orderedIds: string[]) {
  const batch = writeBatch(firestore());
  orderedIds.forEach((cid, order) => batch.set(refs.chapter(uid, mid, cid), { order, updatedBy: SESSION_ID }, { merge: true }));
  await batch.commit();
}
