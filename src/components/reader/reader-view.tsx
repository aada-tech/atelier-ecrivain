'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { onSnapshot } from 'firebase/firestore';
import { ArrowLeft, ChevronLeft, ChevronRight, Highlighter, List, Pause, Play, Square, Type, Volume2, X, Trash2 } from 'lucide-react';
import { useUser } from '@/components/providers/auth-provider';
import { useTheme } from '@/components/providers/theme-provider';
import { ProseView } from '@/components/manuscript/prose-view';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { refs } from '@/lib/data/refs';
import { manuscriptFromData } from '@/lib/data/manuscripts';
import { subscribeChapters } from '@/lib/data/chapters';
import { saveReaderState, subscribeReaderState, type Highlight, type ReaderState } from '@/lib/data/reader';
import { docToPlainText, docToRenderBlocks, orderedFootnotes } from '@/lib/doc/text';
import type { Chapter, Manuscript } from '@/lib/doc/types';
import { usePersistentState } from '@/lib/hooks/use-persistent-state';
import { cn, createId } from '@/lib/utils';
import { useReadAloud } from './use-read-aloud';

interface Prefs {
  fontSize: number;
  leading: number;
  width: 'narrow' | 'medium' | 'wide';
  font: 'serif' | 'sans';
  mode: 'pages' | 'scroll';
}

const timestamp = () => Date.now();

const DEFAULT_PREFS: Prefs = { fontSize: 20, leading: 1.7, width: 'medium', font: 'serif', mode: 'pages' };
const WIDTHS = { narrow: 560, medium: 680, wide: 820 };
const WPM = 230;

export function ReaderView({ mid }: { mid: string }) {
  const user = useUser();
  const { preference, setPreference } = useTheme();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [reader, setReader] = useState<ReaderState>({ highlights: [] });
  const [prefs, setPrefs] = usePersistentState<Prefs>('atelier:reader', DEFAULT_PREFS);
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [chrome, setChrome] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [note, setNote] = useState<{ number: number; text: string } | null>(null);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [activeHl, setActiveHl] = useState<Highlight | null>(null);
  const restored = useRef(false);
  const pendingLastPage = useRef(false);
  const pendingProgress = useRef<number | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const speech = useReadAloud();

  useEffect(
    () => onSnapshot(refs.manuscript(user.uid, mid), (s) => s.exists() && setManuscript(manuscriptFromData(s.id, s.data()))),
    [user.uid, mid],
  );
  useEffect(() => subscribeChapters(user.uid, mid, ({ chapters: list }) => setChapters(list)), [user.uid, mid]);
  useEffect(() => subscribeReaderState(user.uid, mid, setReader), [user.uid, mid]);

  // Reprise de la dernière position.
  useEffect(() => {
    if (restored.current || !chapters?.length) return;
    const pos = reader.position;
    if (!pos) return;
    restored.current = true;
    const i = chapters.findIndex((c) => c.id === pos.chapterId);
    if (i >= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restauration unique de la position de lecture
      setIndex(i);
      pendingProgress.current = pos.progress;
    }
  }, [chapters, reader.position]);

  const chapter = chapters?.[index];
  const blocks = useMemo(() => (chapter ? docToRenderBlocks(chapter.doc) : []), [chapter]);
  const footnotes = useMemo(() => (chapter ? orderedFootnotes(chapter.doc, chapter.notes) : []), [chapter]);
  const chapterHighlights = reader.highlights.filter((h) => h.chapterId === chapter?.id);
  const paged = prefs.mode === 'pages';

  // Mesure de la zone de lecture (pagination par colonnes CSS).
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colWidth = Math.min(WIDTHS[prefs.width], Math.max(280, box.w - 48));
  const gap = 96;

  useLayoutEffect(() => {
    const el = column.current;
    if (!el || !paged || !box.w) return;
    const count = Math.max(1, Math.round((el.scrollWidth + gap) / (colWidth + gap)));
    setPages(count);
    if (pendingLastPage.current) {
      pendingLastPage.current = false;
      setPage(count - 1);
    } else if (pendingProgress.current !== null) {
      setPage(Math.min(count - 1, Math.round(pendingProgress.current * (count - 1))));
      pendingProgress.current = null;
    } else setPage((p) => Math.min(p, count - 1));
  }, [paged, box, colWidth, blocks, prefs.fontSize, prefs.leading, prefs.font, footnotes.length]);

  useEffect(() => {
    if (!paged && pendingProgress.current !== null && viewport.current) {
      const el = viewport.current;
      el.scrollTop = pendingProgress.current * (el.scrollHeight - el.clientHeight);
      pendingProgress.current = null;
    }
  }, [paged, blocks]);

  // Sauvegarde de la position (différée).
  useEffect(() => {
    if (!chapter) return;
    const progress = paged ? (pages > 1 ? page / (pages - 1) : 0) : 0;
    const t = setTimeout(
      () => void saveReaderState(user.uid, mid, { position: { chapterId: chapter.id, progress } }).catch(() => {}),
      1_500,
    );
    return () => clearTimeout(t);
  }, [chapter, page, pages, paged, user.uid, mid]);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (!chapters) return;
      speech.stop();
      if (paged) {
        if (dir === 1 && page < pages - 1) return setPage(page + 1);
        if (dir === -1 && page > 0) return setPage(page - 1);
      }
      const next = index + dir;
      if (next < 0 || next >= chapters.length) return;
      if (dir === -1 && paged) pendingLastPage.current = true;
      setPage(0);
      setIndex(next);
      viewport.current?.scrollTo({ top: 0 });
    },
    [chapters, paged, page, pages, index, speech],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,[role=dialog]')) return;
      if (e.key === 'ArrowRight' || (paged && e.key === ' ' && !e.shiftKey) || e.key === 'PageDown') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || (paged && e.key === ' ' && e.shiftKey) || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, paged]);

  // Balayage tactile.
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const p = e.touches[0];
    touch.current = { x: p.clientX, y: p.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start || !paged) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - start.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(p.clientY - start.y) * 1.5 && Date.now() - start.t < 700) go(dx < 0 ? 1 : -1);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text.length >= 3 && sel?.rangeCount) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setSelection({ text: text.slice(0, 1000), x: r.left + r.width / 2, y: r.top });
      return;
    }
    setSelection(null);
    if (!paged || (e.target as HTMLElement).closest('button,a,mark')) return;
    const x = e.clientX / window.innerWidth;
    if (x < 0.28) go(-1);
    else if (x > 0.72) go(1);
    else setChrome((c) => !c);
  };

  const addHighlight = async (color: Highlight['color']) => {
    if (!selection || !chapter) return;
    const h: Highlight = { id: createId('h'), chapterId: chapter.id, text: selection.text, color, createdAt: timestamp() };
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    await saveReaderState(user.uid, mid, { highlights: [...reader.highlights, h].slice(-500) });
  };

  const removeHighlight = async (id: string) => {
    setActiveHl(null);
    await saveReaderState(user.uid, mid, { highlights: reader.highlights.filter((h) => h.id !== id) });
  };

  if (!chapters || !manuscript) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-4 w-40 skeleton" />
      </div>
    );
  }
  if (!chapter) {
    return (
      <div className="grid min-h-dvh place-items-center text-center">
        <div>
          <p className="font-display text-3xl">Rien à lire pour l’instant</p>
          <Link href={`/atelier?m=${mid}`} className="mt-4 inline-block text-ember underline underline-offset-4">
            Retour à l’atelier
          </Link>
        </div>
      </div>
    );
  }

  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);
  const wordsBefore = chapters.slice(0, index).reduce((s, c) => s + c.wordCount, 0);
  const chapterRatio = paged ? (pages > 1 ? page / (pages - 1) : 1) : 0;
  const overall = totalWords ? (wordsBefore + chapter.wordCount * chapterRatio) / totalWords : 0;
  const minutesLeft = Math.max(1, Math.round((chapter.wordCount * (1 - chapterRatio)) / WPM));

  const content = (
    <>
      <header className="mb-10 text-center" style={{ breakInside: 'avoid' }}>
        <p className="font-mono text-[11px] tracking-[0.25em] text-ember uppercase">Chapitre {index + 1}</p>
        <h1 className="mt-3 font-display text-[2.2em] leading-[1.1]">{chapter.title}</h1>
      </header>
      <ProseView
        blocks={blocks}
        indent
        highlights={chapterHighlights}
        onNoteClick={(id, number) => setNote({ number, text: chapter.notes.find((n) => n.id === id)?.text ?? '' })}
        onHighlightClick={(id) => setActiveHl(reader.highlights.find((h) => h.id === id) ?? null)}
        className={cn(prefs.font === 'sans' && '[font-family:var(--font-sans)]')}
      />
      {footnotes.length > 0 && (
        <aside className="mt-10 border-t border-border pt-4 text-[0.8em] text-muted" aria-label="Notes">
          <ol className="space-y-2">
            {footnotes.map(({ number, note: n }) => (
              <li key={n.id} className="flex gap-2">
                <span className="font-sans text-[0.8em] font-semibold text-ember">{number}</span>
                <span>{n.text}</span>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      {/* ── Barre supérieure ── */}
      <header
        className={cn(
          'absolute inset-x-0 top-0 z-30 flex h-14 items-center gap-1 bg-paper/90 px-2 backdrop-blur transition duration-300 sm:px-4',
          !chrome && '-translate-y-full opacity-0',
        )}
      >
        <Button size="icon" variant="ghost" asChild>
          <Link href={`/atelier?m=${mid}`} aria-label="Retour à l’atelier">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-medium">{manuscript.title}</p>
          <p className="truncate text-xs text-faint">{chapter.title}</p>
        </div>
        {speech.supported && (
          <Button
            size="icon"
            variant="ghost"
            aria-label={speech.state === 'playing' ? 'Mettre la lecture en pause' : 'Lire à voix haute'}
            onClick={() =>
              speech.state === 'playing'
                ? speech.pause()
                : speech.state === 'paused'
                  ? speech.resume()
                  : speech.play(`${chapter.title}. ${docToPlainText(chapter.doc)}`)
            }
          >
            {speech.state === 'playing' ? (
              <Pause className="size-4" />
            ) : speech.state === 'paused' ? (
              <Play className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
        )}
        {speech.state !== 'idle' && (
          <Button size="icon" variant="ghost" onClick={speech.stop} aria-label="Arrêter la lecture">
            <Square className="size-4" />
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={() => setPrefsOpen(true)} aria-label="Réglages de lecture">
          <Type className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setTocOpen(true)} aria-label="Sommaire et surlignages">
          <List className="size-4" />
        </Button>
      </header>

      {/* ── Page ── */}
      <div
        ref={viewport}
        className={cn('relative flex-1 select-text', paged ? 'overflow-hidden' : 'scrollbar-thin overflow-y-auto')}
        style={{ paddingTop: 72, paddingBottom: paged ? 64 : 120 }}
        onPointerUp={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="mx-auto h-full"
          style={{
            width: colWidth,
            ['--prose-size' as string]: `${prefs.fontSize}px`,
            ['--prose-leading' as string]: String(prefs.leading),
            fontSize: prefs.fontSize,
          }}
        >
          {paged ? (
            <div
              ref={column}
              className="h-full transition-transform duration-500 ease-[var(--ease-out-expo)] motion-reduce:transition-none"
              style={{
                columnWidth: colWidth,
                columnGap: gap,
                columnFill: 'auto',
                height: Math.max(200, box.h - 136),
                transform: `translateX(-${page * (colWidth + gap)}px)`,
              }}
            >
              {content}
            </div>
          ) : (
            <div>
              {content}
              {index < chapters.length - 1 && (
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="mt-16 flex w-full items-center justify-between rounded-2xl border border-border px-5 py-4 text-left font-sans transition hover:bg-surface-2"
                >
                  <span>
                    <span className="block text-xs text-faint">Chapitre suivant</span>
                    <span className="text-base font-medium">{chapters[index + 1].title}</span>
                  </span>
                  <ChevronRight className="size-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Progression ── */}
      <footer
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 px-4 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] transition duration-300',
          !chrome && 'opacity-40',
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 text-[11px] text-faint">
          {paged && (
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Page précédente"
              className="grid size-8 place-items-center rounded-full hover:bg-surface-2"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          <span className="tabular-nums">{Math.round(overall * 100)} %</span>
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3"
            role="progressbar"
            aria-label="Progression dans le livre"
            aria-valuenow={Math.round(overall * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-ember transition-[width] duration-500" style={{ width: `${overall * 100}%` }} />
          </div>
          <span className="whitespace-nowrap">
            {paged ? `${page + 1}/${pages} · ` : ''}
            {minutesLeft} min
          </span>
          {paged && (
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Page suivante"
              className="grid size-8 place-items-center rounded-full hover:bg-surface-2"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </footer>

      {/* ── Surligneur ── */}
      {selection && (
        <div
          className="fixed z-40 flex -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-lift"
          style={{ left: selection.x, top: selection.y }}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <Highlighter className="ml-2 size-4 text-muted" />
          {(['amber', 'sage', 'iris', 'ember'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => void addHighlight(c)}
              aria-label={`Surligner en ${c}`}
              className="size-7 rounded-full transition hover:scale-110"
              style={{ background: `var(--c-${c})`, opacity: 0.75 }}
            />
          ))}
        </div>
      )}

      <Dialog open={!!note} onOpenChange={(o) => !o && setNote(null)}>
        {note && (
          <DialogContent title={`Note ${note.number}`} side="bottom" className="mx-auto max-w-2xl">
            <p className="font-serif text-[17px] leading-relaxed">{note.text || 'Note vide.'}</p>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!activeHl} onOpenChange={(o) => !o && setActiveHl(null)}>
        {activeHl && (
          <DialogContent title="Surlignage" side="bottom" className="mx-auto max-w-2xl">
            <blockquote className="border-l-2 border-amber pl-4 font-serif text-lg italic">{activeHl.text}</blockquote>
            <Button className="mt-4" variant="ghost" onClick={() => void removeHighlight(activeHl.id)}>
              <Trash2 className="size-4" /> Retirer
            </Button>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={tocOpen} onOpenChange={setTocOpen}>
        <DialogContent title="Sommaire" side="right">
          <ol className="space-y-1">
            {chapters.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setPage(0);
                    setTocOpen(false);
                    viewport.current?.scrollTo({ top: 0 });
                  }}
                  className={cn(
                    'flex w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-2',
                    i === index && 'bg-surface-2 font-medium',
                  )}
                >
                  <span className="w-5 font-mono text-[11px] text-faint">{i + 1}</span>
                  <span className="flex-1">{c.title}</span>
                  <span className="text-xs text-faint">{Math.max(1, Math.round(c.wordCount / WPM))} min</span>
                </button>
              </li>
            ))}
          </ol>
          {reader.highlights.length > 0 && (
            <>
              <h3 className="mt-8 mb-2 text-xs font-semibold tracking-wider text-faint uppercase">Surlignages</h3>
              <ul className="space-y-2">
                {reader.highlights
                  .slice()
                  .reverse()
                  .map((h) => {
                    const ci = chapters.findIndex((c) => c.id === h.chapterId);
                    return (
                      <li key={h.id} className="rounded-xl border border-border p-3">
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => {
                            if (ci >= 0) setIndex(ci);
                            setPage(0);
                            setTocOpen(false);
                          }}
                        >
                          <p
                            className="line-clamp-3 font-serif text-sm"
                            style={{ borderLeft: `3px solid var(--c-${h.color})`, paddingLeft: 10 }}
                          >
                            {h.text}
                          </p>
                          <p className="mt-1 text-[11px] text-faint">{chapters[ci]?.title ?? 'Chapitre supprimé'}</p>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent title="Lecture" side="bottom" className="mx-auto max-w-lg">
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['light', 'Jour', '#fffdf8', '#17151f'],
                  ['sepia', 'Sépia', '#fbf3e3', '#3a2e22'],
                  ['night', 'Nuit', '#15151c', '#eeebf3'],
                ] as const
              ).map(([id, label, bg, fg]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreference(id)}
                  className={cn('h-14 rounded-xl border border-border font-serif text-base', preference === id && 'ring-2 ring-ember')}
                  style={{ background: bg, color: fg }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div>
              <div className="mb-2 flex justify-between">
                <span className="font-medium">Taille</span>
                <span className="text-muted">{prefs.fontSize} px</span>
              </div>
              <Slider
                min={15}
                max={28}
                step={1}
                value={[prefs.fontSize]}
                onValueChange={([v]) => setPrefs((p) => ({ ...p, fontSize: v }))}
                aria-label="Taille du texte"
              />
            </div>
            <div>
              <div className="mb-2 flex justify-between">
                <span className="font-medium">Interligne</span>
                <span className="text-muted">{prefs.leading.toFixed(2)}</span>
              </div>
              <Slider
                min={1.35}
                max={2.1}
                step={0.05}
                value={[prefs.leading]}
                onValueChange={([v]) => setPrefs((p) => ({ ...p, leading: v }))}
                aria-label="Interligne"
              />
            </div>
            <Segmented
              label="Police"
              value={prefs.font}
              options={[
                ['serif', 'Literata'],
                ['sans', 'Geist'],
              ]}
              onChange={(font) => setPrefs((p) => ({ ...p, font }))}
            />
            <Segmented
              label="Largeur"
              value={prefs.width}
              options={[
                ['narrow', 'Étroite'],
                ['medium', 'Moyenne'],
                ['wide', 'Large'],
              ]}
              onChange={(width) => setPrefs((p) => ({ ...p, width }))}
            />
            <Segmented
              label="Mode"
              value={prefs.mode}
              options={[
                ['pages', 'Pages'],
                ['scroll', 'Défilement'],
              ]}
              onChange={(mode) => setPrefs((p) => ({ ...p, mode }))}
            />
          </div>
        </DialogContent>
      </Dialog>

      {!chrome && (
        <button type="button" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4" onClick={() => setChrome(true)}>
          <X className="size-4" /> Afficher les commandes
        </button>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-medium">{label}</p>
      <div className="grid gap-1 rounded-xl bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={value === v}
            className={cn('h-9 rounded-lg text-sm text-muted', value === v && 'bg-surface text-text shadow-soft')}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
