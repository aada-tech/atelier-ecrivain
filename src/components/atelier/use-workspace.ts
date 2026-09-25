'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { refs } from '@/lib/data/refs';
import { manuscriptFromData, updateManuscript } from '@/lib/data/manuscripts';
import { createChapter, deleteChapter, reorderChapters, saveChapter, subscribeChapters } from '@/lib/data/chapters';
import { createSnapshot } from '@/lib/data/snapshots';
import { recordWords } from '@/lib/data/stats';
import { docWordCount } from '@/lib/doc/text';
import type { Chapter, DocNode, Manuscript } from '@/lib/doc/types';

export type SaveStatus = 'saved' | 'saving' | 'offline' | 'error';

type Draft = Partial<Pick<Chapter, 'doc' | 'title' | 'notes' | 'suggestions' | 'status'>>;

export interface ExternalDoc {
  chapterId: string;
  doc: DocNode;
  version: number;
}

const SAVE_DELAY = 800;
const MAX_WAIT = 5_000;

/**
 * État de travail d'un manuscrit : lecture temps réel (cache hors ligne
 * Firestore), brouillons locaux par chapitre, sauvegarde différée, gestion
 * des modifications venues d'un autre appareil sans jamais rien perdre.
 */
export function useWorkspace(uid: string, mid: string) {
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [missing, setMissing] = useState(false);
  const [serverChapters, setServerChapters] = useState<Chapter[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [external, setExternal] = useState<ExternalDoc | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Source de vérité des brouillons (lue par les callbacks) ; `drafts` n'en est que le reflet pour l'affichage.
  const draftsRef = useRef<Record<string, Draft>>({});
  const chaptersRef = useRef<Chapter[]>([]);
  const timers = useRef(new Map<string, { t: ReturnType<typeof setTimeout>; first: number }>());
  const pending = useRef(0);
  const sent = useRef(new Map<string, Draft>());
  const savedWords = useRef(new Map<string, number>());
  const counterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<string | null>(null);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  const commitDrafts = useCallback((next: Record<string, Draft>) => {
    draftsRef.current = next;
    setDrafts(next);
  }, []);

  // ── Lecture ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return onSnapshot(
      refs.manuscript(uid, mid),
      (snap) => {
        if (!snap.exists()) {
          if (!snap.metadata.fromCache) setMissing(true);
          return;
        }
        setMissing(false);
        setManuscript(manuscriptFromData(snap.id, snap.data()));
      },
      () => setMissing(true),
    );
  }, [uid, mid]);

  useEffect(() => {
    return subscribeChapters(
      uid,
      mid,
      ({ chapters, remoteChanged }) => {
        for (const c of chapters) if (!savedWords.current.has(c.id)) savedWords.current.set(c.id, c.wordCount);
        chaptersRef.current = chapters;
        setServerChapters(chapters);
        const active = activeRef.current;
        if (active && remoteChanged.has(active)) {
          const remote = chapters.find((c) => c.id === active);
          if (!remote) return;
          if (draftsRef.current[active]?.doc) {
            // Conflit : nos modifications locales gagnent, mais la version distante est archivée.
            void createSnapshot(uid, mid, remote, 'Version reçue d’un autre appareil', true).catch(() => {});
          } else {
            savedWords.current.set(remote.id, remote.wordCount);
            setExternal((prev) => ({ chapterId: remote.id, doc: remote.doc, version: (prev?.version ?? 0) + 1 }));
          }
        }
      },
      () => setStatus('error'),
    );
  }, [uid, mid]);

  // Chapitres affichés = serveur + brouillons locaux.
  const chapters = useMemo<Chapter[]>(() => {
    if (!serverChapters) return [];
    return serverChapters.map((c) => {
      const d = drafts[c.id];
      if (!d) return c;
      const merged = { ...c, ...d };
      if (d.doc) merged.wordCount = docWordCount(d.doc);
      return merged;
    });
  }, [serverChapters, drafts]);

  // Chapitre actif par défaut : dernier ouvert sur cet appareil, sinon le premier.
  useEffect(() => {
    if (!serverChapters?.length) return;
    if (activeId && serverChapters.some((c) => c.id === activeId)) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(`atelier:last-chapter:${mid}`);
    } catch {}
    const next = serverChapters.find((c) => c.id === stored)?.id ?? serverChapters[0].id;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sélection initiale dérivée des données chargées
    setActiveIdState(next);
  }, [serverChapters, activeId, mid]);

  // ── Écriture ─────────────────────────────────────────────────────────────
  const scheduleCounters = useCallback(() => {
    if (counterTimer.current) clearTimeout(counterTimer.current);
    counterTimer.current = setTimeout(() => {
      const list = chaptersRef.current;
      const total = list.reduce(
        (s, c) => s + (draftsRef.current[c.id]?.doc ? docWordCount(draftsRef.current[c.id]!.doc!) : c.wordCount),
        0,
      );
      void updateManuscript(uid, mid, { wordCount: total, chapterCount: list.length }).catch(() => {});
    }, 4_000);
  }, [uid, mid]);

  const flush = useCallback(
    (cid: string) => {
      const timer = timers.current.get(cid);
      if (timer) clearTimeout(timer.t);
      timers.current.delete(cid);
      const draft = draftsRef.current[cid];
      // Rien à faire si ce brouillon exact a déjà été envoyé (il reste affiché quelques instants).
      if (!draft || sent.current.get(cid) === draft) return;
      sent.current.set(cid, draft);
      const patch: Parameters<typeof saveChapter>[3] = { ...draft };
      if (draft.doc) {
        const words = docWordCount(draft.doc);
        patch.wordCount = words;
        const before = savedWords.current.get(cid) ?? words;
        if (words > before) void recordWords(uid, words - before).catch(() => {});
        savedWords.current.set(cid, words);
      }
      // Le brouillon reste affiché le temps que l'instantané Firestore reflète l'écriture :
      // le retirer aussitôt ferait brièvement réapparaître l'ancienne version (et
      // remonterait les champs en cours de saisie). Retiré seulement s'il n'a pas changé.
      setTimeout(() => {
        if (draftsRef.current[cid] !== draft) return;
        const rest = { ...draftsRef.current };
        delete rest[cid];
        commitDrafts(rest);
      }, 1_500);

      pending.current++;
      setStatus(navigator.onLine ? 'saving' : 'offline');
      saveChapter(uid, mid, cid, patch)
        .then(() => {
          pending.current--;
          if (pending.current === 0 && !timers.current.size) {
            setStatus('saved');
            setLastSavedAt(Date.now());
          }
        })
        .catch((err) => {
          pending.current--;
          console.error('[atelier] sauvegarde impossible', err);
          setStatus('error');
          // On restaure le brouillon pour réessayer à la prochaine modification.
          commitDrafts({ ...draftsRef.current, [cid]: { ...draft, ...draftsRef.current[cid] } });
        });
      scheduleCounters();
    },
    [uid, mid, scheduleCounters, commitDrafts],
  );

  const flushAll = useCallback(() => {
    for (const cid of Object.keys(draftsRef.current)) flush(cid);
  }, [flush]);

  const updateChapter = useCallback(
    (cid: string, patch: Draft) => {
      commitDrafts({ ...draftsRef.current, [cid]: { ...draftsRef.current[cid], ...patch } });
      setStatus((s) => (s === 'error' ? s : navigator.onLine ? 'saving' : 'offline'));
      const existing = timers.current.get(cid);
      const first = existing?.first ?? Date.now();
      if (existing) clearTimeout(existing.t);
      const wait = Date.now() - first > MAX_WAIT ? 0 : SAVE_DELAY;
      timers.current.set(cid, { t: setTimeout(() => flush(cid), wait), first });
    },
    [flush, commitDrafts],
  );

  // Sauvegarde à la mise en arrière-plan / fermeture.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flushAll();
    const onOnline = () => setStatus((s) => (s === 'offline' ? (pending.current ? 'saving' : 'saved') : s));
    const onOffline = () => setStatus('offline');
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushAll);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushAll);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      flushAll();
    };
  }, [flushAll]);

  const setActiveId = useCallback(
    (cid: string) => {
      if (activeRef.current) flush(activeRef.current);
      setActiveIdState(cid);
      activeRef.current = cid;
      try {
        localStorage.setItem(`atelier:last-chapter:${mid}`, cid);
      } catch {}
    },
    [flush, mid],
  );

  const addChapter = useCallback(
    async (title?: string) => {
      const order = chaptersRef.current.length;
      const cid = await createChapter(uid, mid, title ?? `Chapitre ${order + 1}`, order);
      setActiveId(cid);
      scheduleCounters();
      return cid;
    },
    [uid, mid, setActiveId, scheduleCounters],
  );

  const removeChapter = useCallback(
    async (cid: string) => {
      const chapter = chaptersRef.current.find((c) => c.id === cid);
      if (chapter) await createSnapshot(uid, mid, chapter, `Chapitre supprimé : ${chapter.title}`, false).catch(() => {});
      timers.current.delete(cid);
      const rest = { ...draftsRef.current };
      delete rest[cid];
      commitDrafts(rest);
      await deleteChapter(uid, mid, cid);
      if (activeRef.current === cid) {
        const rest = chaptersRef.current.filter((c) => c.id !== cid);
        if (rest[0]) setActiveIdState(rest[0].id);
      }
      scheduleCounters();
    },
    [uid, mid, scheduleCounters, commitDrafts],
  );

  const moveChapter = useCallback(
    async (cid: string, toIndex: number) => {
      const ids = chaptersRef.current.map((c) => c.id);
      const from = ids.indexOf(cid);
      if (from === -1 || toIndex < 0 || toIndex >= ids.length || from === toIndex) return;
      ids.splice(toIndex, 0, ids.splice(from, 1)[0]);
      setServerChapters((prev) => (prev ? ids.map((id, order) => ({ ...prev.find((c) => c.id === id)!, order })) : prev));
      await reorderChapters(uid, mid, ids);
    },
    [uid, mid],
  );

  const renameManuscript = useCallback(
    (title: string) => updateManuscript(uid, mid, { title: title.trim().slice(0, 200) || 'Sans titre' }),
    [uid, mid],
  );

  const active = chapters.find((c) => c.id === activeId) ?? null;
  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);

  return {
    loading: serverChapters === null,
    missing,
    manuscript,
    chapters,
    active,
    activeId,
    setActiveId,
    updateChapter,
    flush,
    addChapter,
    removeChapter,
    moveChapter,
    renameManuscript,
    status,
    lastSavedAt,
    external,
    totalWords,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
