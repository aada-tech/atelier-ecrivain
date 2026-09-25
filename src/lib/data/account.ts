'use client';

import { getDocs, getDoc } from 'firebase/firestore';
import { refs } from './refs';
import { deleteAll } from './manuscripts';
import { chapterFromFirestore, toMillis } from '@/lib/doc/legacy';
import { chapterToMarkdown } from '@/lib/doc/text';

/**
 * Portabilité (RGPD art. 20) : toutes les données de l'utilisateur dans un
 * format structuré et lisible (JSON) + les manuscrits en Markdown.
 */
export async function collectUserData(uid: string) {
  const profileSnap = await getDoc(refs.profile(uid));
  const manuscriptsSnap = await getDocs(refs.manuscripts(uid));
  const statsSnap = await getDocs(refs.stats(uid));

  const manuscripts = [];
  const markdown: { path: string; content: string }[] = [];
  for (const m of manuscriptsSnap.docs) {
    const [chaptersSnap, metaSnap, snapsSnap] = await Promise.all([
      getDocs(refs.chapters(uid, m.id)),
      getDocs(refs.metaCol(uid, m.id)),
      getDocs(refs.snapshots(uid, m.id)),
    ]);
    const chapters = chaptersSnap.docs
      .map((d, i) => chapterFromFirestore(d.id, d.data(), i))
      .sort((a, b) => a.order - b.order);
    const data = m.data();
    const title = typeof data.title === 'string' ? data.title : 'Sans titre';
    manuscripts.push({
      id: m.id,
      ...serialize(data),
      chapters,
      meta: Object.fromEntries(metaSnap.docs.map((d) => [d.id, serialize(d.data())])),
      snapshots: snapsSnap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })),
    });
    const slug = slugify(title) || m.id;
    markdown.push({
      path: `${slug}/${slug}.md`,
      content: chapters.map((c) => chapterToMarkdown(c.title, c.doc, c.notes)).join('\n\n---\n\n'),
    });
  }

  return {
    json: {
      exportedAt: new Date().toISOString(),
      format: 'atelier-ecrivain/export@2',
      profile: serialize(profileSnap.data() ?? {}),
      manuscripts,
      stats: statsSnap.docs.map((d) => ({ day: d.id, ...serialize(d.data()) })),
    },
    markdown,
  };
}

/** Effacement (RGPD art. 17) de toutes les données Firestore de l'utilisateur. */
export async function deleteAllUserData(uid: string) {
  const manuscriptsSnap = await getDocs(refs.manuscripts(uid));
  for (const m of manuscriptsSnap.docs) {
    const [a, b, c] = await Promise.all([
      getDocs(refs.chapters(uid, m.id)),
      getDocs(refs.metaCol(uid, m.id)),
      getDocs(refs.snapshots(uid, m.id)),
    ]);
    await deleteAll([...a.docs, ...b.docs, ...c.docs].map((d) => d.ref));
  }
  const statsSnap = await getDocs(refs.stats(uid));
  await deleteAll([...manuscriptsSnap.docs.map((d) => d.ref), ...statsSnap.docs.map((d) => d.ref), refs.profile(uid)]);
}

function serialize(value: unknown): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => {
      if (v && typeof v === 'object' && ('seconds' in v || 'toMillis' in v) && Object.keys(v).length <= 2) {
        const ms = toMillis(v);
        return ms ? new Date(ms).toISOString() : v;
      }
      return v;
    }),
  );
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
