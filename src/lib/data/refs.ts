'use client';

import { collection, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import { createId } from '@/lib/utils';

/** Identifiant de cet onglet : permet d'ignorer l'écho de nos propres écritures. */
export const SESSION_ID = createId('tab-');

export const refs = {
  profile: (uid: string) => doc(firestore(), 'users', uid, 'profile', 'info'),
  manuscripts: (uid: string) => collection(firestore(), 'users', uid, 'manuscripts'),
  manuscript: (uid: string, mid: string) => doc(firestore(), 'users', uid, 'manuscripts', mid),
  chapters: (uid: string, mid: string) => collection(firestore(), 'users', uid, 'manuscripts', mid, 'chapters'),
  chapter: (uid: string, mid: string, cid: string) => doc(firestore(), 'users', uid, 'manuscripts', mid, 'chapters', cid),
  meta: (uid: string, mid: string, name: 'book' | 'cover' | 'reader' | 'notes') =>
    doc(firestore(), 'users', uid, 'manuscripts', mid, 'meta', name),
  metaCol: (uid: string, mid: string) => collection(firestore(), 'users', uid, 'manuscripts', mid, 'meta'),
  snapshots: (uid: string, mid: string) => collection(firestore(), 'users', uid, 'manuscripts', mid, 'snapshots'),
  snapshot: (uid: string, mid: string, sid: string) => doc(firestore(), 'users', uid, 'manuscripts', mid, 'snapshots', sid),
  stats: (uid: string) => collection(firestore(), 'users', uid, 'stats'),
  stat: (uid: string, day: string) => doc(firestore(), 'users', uid, 'stats', day),
};
