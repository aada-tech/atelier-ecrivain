'use client';

import { onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { refs } from './refs';

export interface Highlight {
  id: string;
  chapterId: string;
  text: string;
  color: 'amber' | 'sage' | 'iris' | 'ember';
  note?: string;
  createdAt: number;
}

export interface ReaderState {
  highlights: Highlight[];
  position?: { chapterId: string; progress: number };
}

const COLORS = new Set(['amber', 'sage', 'iris', 'ember']);

export function subscribeReaderState(uid: string, mid: string, cb: (s: ReaderState) => void) {
  return onSnapshot(
    refs.meta(uid, mid, 'reader'),
    (snap) => {
      const data = snap.data() ?? {};
      const highlights = Array.isArray(data.highlights)
        ? (data.highlights as Highlight[])
            .filter((h) => h && typeof h.text === 'string' && typeof h.chapterId === 'string')
            .map((h) => ({ ...h, color: COLORS.has(h.color) ? h.color : 'amber' }))
        : [];
      const position =
        data.position && typeof data.position.chapterId === 'string'
          ? { chapterId: data.position.chapterId as string, progress: Number(data.position.progress) || 0 }
          : undefined;
      cb({ highlights, position });
    },
    () => cb({ highlights: [] }),
  );
}

export async function saveReaderState(uid: string, mid: string, patch: Partial<ReaderState>) {
  await setDoc(refs.meta(uid, mid, 'reader'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}
