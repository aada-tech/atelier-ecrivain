'use client';

import { getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { refs } from './refs';
import type { BookMetadata, CoverConfig, FrontBackMatterSection } from '@/features/export/types/bookMeta';
import type { ExportSettings } from '@/features/export/types/exportSettings';

export interface BookMeta {
  metadata: Partial<BookMetadata>;
  sections: FrontBackMatterSection[];
  cover: CoverConfig;
  settings?: ExportSettings;
}

/** Limite d'une image de couverture stockée dans Firestore (doc ≤ 1 Mio). */
export const MAX_COVER_BYTES = 850_000;

export async function loadBookMeta(uid: string, mid: string): Promise<BookMeta | null> {
  const [meta, cover] = await Promise.all([getDoc(refs.meta(uid, mid, 'book')), getDoc(refs.meta(uid, mid, 'cover'))]);
  if (!meta.exists()) return null;
  const data = meta.data() as Partial<BookMeta>;
  const coverData = cover.exists() ? (cover.data() as { dataUrl?: string }) : undefined;
  const coverConfig = (data.cover ?? { mode: 'none' }) as CoverConfig;
  if (coverData?.dataUrl && coverData.dataUrl.startsWith('data:image/')) coverConfig.imageUrl = coverData.dataUrl;
  // Champs d'édition de la v1 (éditeur, ISBN…) : l'Atelier est un outil de brouillon, on ne les reprend pas.
  const {
    isbn: _isbn,
    publisher: _publisher,
    publisherLogoUrl: _logo,
    copyrightYear: _year,
    legalNotice: _notice,
    ...metadata
  } = (data.metadata ?? {}) as Partial<BookMetadata> & Record<string, unknown>;
  return {
    metadata,
    sections: Array.isArray(data.sections) ? data.sections : [],
    cover: coverConfig,
    settings: data.settings,
  };
}

export async function saveBookMeta(uid: string, mid: string, meta: BookMeta) {
  const { imageUrl, ...coverRest } = meta.cover;
  const isData = typeof imageUrl === 'string' && imageUrl.startsWith('data:image/');
  await setDoc(refs.meta(uid, mid, 'book'), {
    metadata: meta.metadata,
    sections: meta.sections,
    cover: { ...coverRest, imageUrl: isData ? null : (imageUrl ?? null) },
    settings: meta.settings ?? null,
    updatedAt: serverTimestamp(),
  });
  if (isData && imageUrl.length <= MAX_COVER_BYTES) {
    await setDoc(refs.meta(uid, mid, 'cover'), { dataUrl: imageUrl, updatedAt: serverTimestamp() });
  } else if (!imageUrl) {
    await deleteDoc(refs.meta(uid, mid, 'cover')).catch(() => {});
  }
}
