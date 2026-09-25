'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import {
  BookOpen,
  Camera,
  Command as CommandIcon,
  Download,
  Focus,
  Globe,
  History,
  Keyboard,
  ListTree,
  Mic,
  NotebookPen,
  PanelRight,
  Plus,
  ScanSearch,
  Sparkles,
  Type,
  AlignCenterVertical,
  Library,
} from 'lucide-react';
import { useAuth, useUser } from '@/components/providers/auth-provider';
import { useAiGate } from '@/components/app/ai-consent';
import { useWritingStats } from '@/components/app/use-stats';
import { UserMenu } from '@/components/app/user-menu';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, Kbd, ProgressRing } from '@/components/ui/misc';
import { LogoMark } from '@/components/ui/logo';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ai, AiRequestError } from '@/lib/ai/client';
import type { ResearchResponse } from '@/lib/ai/contracts';
import { createChapter } from '@/lib/data/chapters';
import { saveChapter } from '@/lib/data/chapters';
import type { Snapshot } from '@/lib/data/snapshots';
import { docToPlainText } from '@/lib/doc/text';
import type { ChapterStatus, DocNode, Note, Suggestion } from '@/lib/doc/types';
import { usePersistentState, useMediaQuery } from '@/lib/hooks/use-persistent-state';
import { cn, createId, formatNumber, formatRelative } from '@/lib/utils';
import { ChapterEditor, type EditorSettings } from './chapter-editor';
import { ChapterSidebar } from './chapter-sidebar';
import { CommandPalette, type PaletteAction } from './command-palette';
import { DictationDock } from './dictation-dock';
import { contextBefore, insertDictation, insertFootnoteRef, revealText } from './editor/commands';
import { getGhost, setDecorations } from './editor/extensions';
import { NotesPanel } from './panels/notes-panel';
import { ResearchPanel } from './panels/research-panel';
import { SuggestionsPanel } from './panels/suggestions-panel';
import { VersionsPanel } from './panels/versions-panel';
import { useDictation } from './use-dictation';
import { useWorkspace, type SaveStatus } from './use-workspace';

const ExportDialog = dynamic(() => import('@/components/export/export-dialog'), { ssr: false });

type Tab = 'suggestions' | 'notes' | 'research' | 'versions';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'suggestions', label: 'Ratures', icon: <Sparkles /> },
  { id: 'notes', label: 'Notes', icon: <NotebookPen /> },
  { id: 'research', label: 'Recherche', icon: <Globe /> },
  { id: 'versions', label: 'Versions', icon: <History /> },
];

const DEFAULT_SETTINGS: EditorSettings & { inspector: boolean } = {
  focusMode: false,
  typewriter: false,
  fontSize: 19,
  indent: false,
  inspector: true,
};

export function AtelierApp({ mid }: { mid: string }) {
  const user = useUser();
  const { profile, saveProfile } = useAuth();
  const gate = useAiGate();
  const router = useRouter();
  const params = useSearchParams();
  const ws = useWorkspace(user.uid, mid);
  const { today, streak } = useWritingStats(user.uid, 30);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [editor, setEditor] = useState<Editor | null>(null);
  const editorRef = useRef<Editor | null>(null);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  const [settings, setSettings] = usePersistentState('atelier:editor-settings', DEFAULT_SETTINGS);
  const [tab, setTab] = useState<Tab>('suggestions');
  const [mobileSheet, setMobileSheet] = useState<'chapters' | 'inspector' | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [busy, setBusy] = useState<'analyze' | 'factcheck' | null>(null);
  const [highlightNote, setHighlightNote] = useState<string | null>(null);
  const [liveDoc, setLiveDoc] = useState<DocNode | null>(null);
  const dictationStart = useRef<number | null>(null);

  const active = ws.active;
  const doc = liveDoc ?? active?.doc ?? null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nouveau chapitre actif : on repart de sa version enregistrée
    setLiveDoc(null);
  }, [ws.activeId]);

  useEffect(() => {
    if (ws.missing) {
      toast.error('Ce manuscrit est introuvable.');
      router.replace('/bibliotheque');
    }
  }, [ws.missing, router]);

  useEffect(() => {
    if (!active?.id || !ws.manuscript) return;
    if (profile.lastManuscriptId !== mid) void saveProfile({ lastManuscriptId: mid }).catch(() => {});
  }, [active?.id, ws.manuscript, mid, profile.lastManuscriptId, saveProfile]);

  // Décorations des suggestions en attente dans le texte.
  const pendingSuggestions = useMemo(() => active?.suggestions.filter((s) => s.status === 'pending') ?? [], [active?.suggestions]);
  useEffect(() => {
    if (!editor) return;
    setDecorations(editor, { suggestions: pendingSuggestions.map((s) => ({ id: s.id, text: s.original })) });
  }, [editor, pendingSuggestions]);

  const inspectorVisible = isDesktop && settings.inspector && !settings.focusMode;
  const openTab = useCallback(
    (t: Tab) => {
      setTab(t);
      if (isDesktop) setSettings((s) => ({ ...s, inspector: true, focusMode: false }));
      else setMobileSheet('inspector');
    },
    [isDesktop, setSettings],
  );

  // ── Modifications du chapitre actif ──────────────────────────────────────
  const onDocChange = useCallback(
    (next: DocNode) => {
      if (!ws.activeId) return;
      setLiveDoc(next);
      ws.updateChapter(ws.activeId, { doc: next });
    },
    [ws],
  );
  const setNotes = useCallback((notes: Note[]) => ws.activeId && ws.updateChapter(ws.activeId, { notes }), [ws]);
  const setSuggestions = useCallback(
    (suggestions: Suggestion[]) => ws.activeId && ws.updateChapter(ws.activeId, { suggestions }),
    [ws],
  );
  const addSuggestions = useCallback(
    (items: Suggestion[]) => {
      if (!active) return;
      const existing = new Set(active.suggestions.filter((s) => s.status === 'pending').map((s) => `${s.original}→${s.replacement}`));
      const fresh = items.filter((s) => !existing.has(`${s.original}→${s.replacement}`));
      setSuggestions([...fresh, ...active.suggestions]);
      return fresh.length;
    },
    [active, setSuggestions],
  );

  const aiFail = (err: unknown) => {
    if ((err as Error)?.name === 'AbortError') return;
    toast.error(err instanceof AiRequestError ? err.message : 'Le service IA est indisponible.');
  };

  // ── IA : ratures & vérification ─────────────────────────────────────────
  const analyze = useCallback(
    async (text: string, scope: 'selection' | 'chapter') => {
      if (!text.trim()) return toast.message('Sélectionnez d’abord un passage.');
      if (!(await gate.ensure())) return;
      setBusy('analyze');
      openTab('suggestions');
      try {
        const chunks = scope === 'chapter' ? chunkText(text, 7_000).slice(0, 3) : [text.slice(0, 7_000)];
        let count = 0;
        const collected: Suggestion[] = [];
        for (const chunk of chunks) {
          const res = await ai.analyze({ text: chunk, scope, context: active?.title });
          collected.push(
            ...res.suggestions.map<Suggestion>((s) => ({
              id: createId('s'),
              kind: 'style',
              original: s.original,
              replacement: s.replacement,
              explanation: s.explanation,
              status: 'pending',
              createdAt: Date.now(),
            })),
          );
        }
        count = addSuggestions(collected) ?? 0;
        toast.success(count ? `${count} rature${count > 1 ? 's' : ''} proposée${count > 1 ? 's' : ''}` : 'Rien à redire : le passage est fluide.');
      } catch (err) {
        aiFail(err);
      } finally {
        setBusy(null);
      }
    },
    [gate, openTab, active?.title, addSuggestions],
  );

  const factcheck = useCallback(
    async (text: string) => {
      if (!text.trim()) return toast.message('Sélectionnez d’abord un passage.');
      if (!(await gate.ensure())) return;
      setBusy('factcheck');
      openTab('suggestions');
      try {
        const res = await ai.factcheck(text.slice(0, 8_000));
        const items = res.claims.map<Suggestion>((c) => ({
          id: createId('s'),
          kind: 'fact',
          original: c.claim,
          replacement: c.verdict === 'error' || c.verdict === 'caution' ? c.correction : '',
          explanation: c.explanation,
          verdict: c.verdict,
          sources: res.sources.slice(0, 4),
          status: 'pending',
          createdAt: Date.now(),
        }));
        const n = addSuggestions(items) ?? 0;
        if (!res.grounded) toast.warning('Aucune source web trouvée : résultats non vérifiés.');
        else toast.success(n ? `${n} affirmation${n > 1 ? 's' : ''} vérifiée${n > 1 ? 's' : ''}` : 'Aucune affirmation factuelle à vérifier.');
      } catch (err) {
        aiFail(err);
      } finally {
        setBusy(null);
      }
    },
    [gate, openTab, addSuggestions],
  );

  const research = useCallback(
    async (query: string): Promise<ResearchResponse | null> => {
      if (!(await gate.ensure())) return null;
      try {
        return await ai.research({ query, context: doc ? docToPlainText(doc).slice(-1_500) : undefined });
      } catch (err) {
        aiFail(err);
        return null;
      }
    },
    [gate, doc],
  );

  const saveResearch = useCallback(
    (r: ResearchResponse, query: string) => {
      if (!active) return;
      const text = [`Recherche : ${query}`, r.summary, ...r.keyPoints.map((p) => `• ${p}`)].join('\n');
      setNotes([
        ...active.notes,
        { id: createId('n'), kind: 'memo', text, source: 'research', createdAt: Date.now(), links: r.sources.slice(0, 8) },
      ]);
      toast.success('Ajouté à vos pense-bêtes');
    },
    [active, setNotes],
  );

  const addFootnote = useCallback(() => {
    if (!editor || !active) return;
    const id = createId('n');
    setNotes([...active.notes, { id, kind: 'footnote', text: '', source: 'manual', createdAt: Date.now() }]);
    insertFootnoteRef(editor, id);
    setHighlightNote(id);
    openTab('notes');
  }, [editor, active, setNotes, openTab]);

  // ── Dictée ───────────────────────────────────────────────────────────────
  const dictation = useDictation({
    engine: profile.dictationEngine,
    aiAllowed: gate.allowed,
    getContext: () => (editor && dictationStart.current !== null ? contextBefore(editor, dictationStart.current) : ''),
    onLive: (text) => {
      if (!editor) return;
      const ghost = getGhost(editor);
      if (!text && dictation.state.phase !== 'processing') {
        setDecorations(editor, { ghost: null });
        return;
      }
      setDecorations(editor, {
        ghost: { pos: ghost?.pos ?? dictationStart.current ?? editor.state.selection.to, text, pending: false },
      });
    },
    onResult: ({ text, revisions }) => {
      if (!editor) return;
      const pos = getGhost(editor)?.pos ?? dictationStart.current ?? editor.state.selection.to;
      setDecorations(editor, { ghost: null });
      insertDictation(editor, pos, text);
      dictationStart.current = null;
      if (revisions.length) {
        addSuggestions(
          revisions.map<Suggestion>((r) => ({
            id: createId('s'),
            kind: 'dictation',
            original: r.replacement,
            replacement: r.original,
            explanation: r.explanation || 'Variante que vous avez dictée puis reprise.',
            status: 'pending',
            createdAt: Date.now(),
          })),
        );
      }
      toast.success('Dictée insérée', {
        action: { label: 'Annuler', onClick: () => editor.commands.undo() },
      });
    },
    onError: (message) => toast.error(message),
  });

  useEffect(() => {
    if (!editor) return;
    const ghost = getGhost(editor);
    if (dictation.state.phase === 'processing' && ghost) setDecorations(editor, { ghost: { ...ghost, pending: true } });
  }, [dictation.state.phase, editor]);

  const startDictation = useCallback(() => {
    if (!editor) return;
    if (!editor.isFocused && editor.state.selection.from <= 1) {
      editor.commands.focus('end');
    }
    dictationStart.current = editor.state.selection.to;
    setDecorations(editor, { ghost: { pos: dictationStart.current, text: '', pending: false } });
    void dictation.start();
  }, [editor, dictation]);

  const toggleDictation = useCallback(() => {
    if (dictation.state.phase === 'idle') startDictation();
    else void dictation.stop();
  }, [dictation, startDictation]);

  // Lien profond « Dictée instantanée » depuis la bibliothèque.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!editor || autoStarted.current || params.get('action') !== 'dicter') return;
    autoStarted.current = true;
    editor.commands.focus('end');
    startDictation();
    router.replace(`/atelier?m=${mid}`);
  }, [editor, params, startDictation, router, mid]);

  // ── Versions ─────────────────────────────────────────────────────────────
  const restoreSnapshot = useCallback(
    (s: Snapshot) => {
      if (!ws.activeId || !editor) return;
      editor.commands.setContent(s.doc);
      ws.updateChapter(ws.activeId, { doc: s.doc, notes: s.notes });
      setLiveDoc(s.doc);
    },
    [ws, editor],
  );
  const restoreDeleted = useCallback(
    async (s: Snapshot) => {
      const cid = await createChapter(user.uid, mid, s.title, ws.chapters.length);
      await saveChapter(user.uid, mid, cid, { doc: s.doc, notes: s.notes, wordCount: s.wordCount });
      ws.setActiveId(cid);
      toast.success(`« ${s.title} » est de retour`);
    },
    [user.uid, mid, ws],
  );

  const onSearchHit = useCallback(
    (chapterId: string, query: string) => {
      ws.setActiveId(chapterId);
      setTimeout(() => {
        const ed = editorRef.current;
        if (!ed) return;
        setDecorations(ed, { search: query });
        revealText(ed, query);
        setTimeout(() => !ed.isDestroyed && setDecorations(ed, { search: '' }), 6_000);
      }, 250);
    },
    [ws],
  );
  // ── Raccourcis ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.altKey && e.code === 'KeyD') {
        e.preventDefault();
        toggleDictation();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (ws.activeId) ws.flush(ws.activeId);
        toast.success('Enregistré');
      } else if (e.altKey && e.code === 'KeyF') {
        e.preventDefault();
        setSettings((s) => ({ ...s, focusMode: !s.focusMode }));
      } else if (e.key === 'Escape' && dictation.state.phase !== 'idle') {
        dictation.cancel();
      } else if (mod && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleDictation, ws, setSettings, dictation]);

  const selection = () => {
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, '\n\n', '').trim();
  };

  const actions: PaletteAction[] = [
    { id: 'dictate', group: 'Écrire', label: dictation.state.phase === 'idle' ? 'Dicter' : 'Terminer la dictée', icon: <Mic />, shortcut: '⌥D', run: toggleDictation, keywords: ['voix', 'micro'] },
    { id: 'new-chapter', group: 'Écrire', label: 'Nouveau chapitre', icon: <Plus />, run: () => void ws.addChapter() },
    { id: 'footnote', group: 'Écrire', label: 'Insérer une note de bas de page', icon: <NotebookPen />, run: addFootnote },
    { id: 'focus', group: 'Écrire', label: settings.focusMode ? 'Quitter le mode focus' : 'Mode focus', icon: <Focus />, shortcut: '⌥F', run: () => setSettings((s) => ({ ...s, focusMode: !s.focusMode })) },
    { id: 'typewriter', group: 'Écrire', label: settings.typewriter ? 'Désactiver la machine à écrire' : 'Mode machine à écrire', icon: <AlignCenterVertical />, run: () => setSettings((s) => ({ ...s, typewriter: !s.typewriter })) },
    { id: 'analyze-sel', group: 'Assistant IA', label: 'Raturer la sélection', icon: <Sparkles />, run: () => void analyze(selection(), 'selection') },
    { id: 'analyze', group: 'Assistant IA', label: 'Raturer tout le chapitre', icon: <Sparkles />, run: () => doc && void analyze(docToPlainText(doc), 'chapter') },
    { id: 'factcheck', group: 'Assistant IA', label: 'Vérifier les faits du chapitre', icon: <ScanSearch />, run: () => doc && void factcheck(docToPlainText(doc)) },
    { id: 'research', group: 'Assistant IA', label: 'Recherche documentaire', icon: <Globe />, run: () => openTab('research') },
    { id: 'snapshot', group: 'Manuscrit', label: 'Figer une version du chapitre', icon: <Camera />, run: () => openTab('versions') },
    { id: 'read', group: 'Manuscrit', label: 'Ouvrir dans la liseuse', icon: <BookOpen />, run: () => router.push(`/liseuse?m=${mid}`) },
    { id: 'export', group: 'Manuscrit', label: 'Exporter (PDF, EPUB, Markdown)', icon: <Download />, run: () => setExportOpen(true) },
    { id: 'display', group: 'Manuscrit', label: 'Réglages d’affichage', icon: <Type />, run: () => setDisplayOpen(true) },
    { id: 'library', group: 'Manuscrit', label: 'Retour à la bibliothèque', icon: <Library />, run: () => router.push('/bibliotheque') },
    { id: 'shortcuts', group: 'Aide', label: 'Raccourcis clavier', icon: <Keyboard />, shortcut: '⌘/', run: () => setShortcutsOpen(true) },
  ];

  if (ws.loading || !ws.manuscript) return <AtelierSkeleton />;

  const goal = profile.dailyGoal;
  const chapterIndex = ws.chapters.findIndex((c) => c.id === ws.activeId);

  const inspector = active && doc && (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 px-3 pb-3 pt-3" role="tablist" aria-label="Inspecteur">
        {TABS.map((t) => {
          const count =
            t.id === 'suggestions' ? pendingSuggestions.length : t.id === 'notes' ? active.notes.length : 0;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium text-muted transition hover:text-text [&>svg]:size-3.5',
                tab === t.id && 'bg-surface-2 text-text',
              )}
            >
              {t.icon}
              <span className="hidden xl:inline">{t.label}</span>
              {count > 0 && <span className="rounded-full bg-iris-soft px-1.5 text-[10px] text-iris">{count}</span>}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1" role="tabpanel">
        {tab === 'suggestions' && (
          <SuggestionsPanel
            suggestions={active.suggestions}
            editor={editor}
            onChange={setSuggestions}
            onAnalyzeChapter={() => void analyze(docToPlainText(doc), 'chapter')}
            onFactcheckChapter={() => void factcheck(docToPlainText(doc))}
            busy={busy}
          />
        )}
        {tab === 'notes' && <NotesPanel notes={active.notes} doc={doc} editor={editor} highlightedId={highlightNote} onChange={setNotes} />}
        {tab === 'research' && <ResearchPanel onResearch={research} onSave={saveResearch} />}
        {tab === 'versions' && (
          <VersionsPanel
            uid={user.uid}
            mid={mid}
            chapter={{ ...active, doc }}
            chapterIds={ws.chapters.map((c) => c.id)}
            onRestore={restoreSnapshot}
            onRestoreDeleted={(s) => void restoreDeleted(s)}
          />
        )}
      </div>
    </div>
  );

  const sidebar = (
    <ChapterSidebar
      chapters={ws.chapters}
      activeId={ws.activeId}
      totalWords={ws.totalWords}
      targetWords={ws.manuscript.goal?.targetWords}
      onSelect={(id) => {
        ws.setActiveId(id);
        setMobileSheet(null);
      }}
      onAdd={() => {
        void ws.addChapter();
        setMobileSheet(null);
      }}
      onRename={(id, title) => ws.updateChapter(id, { title })}
      onStatus={(id, status: ChapterStatus) => ws.updateChapter(id, { status })}
      onMove={(id, to) => void ws.moveChapter(id, to)}
      onDelete={(id) => void ws.removeChapter(id)}
    />
  );

  return (
    <div className={cn('min-h-dvh', settings.focusMode && 'atelier-focus')}>
      {/* ── Barre supérieure ── */}
      <header
        className={cn(
          'sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/70 bg-bg/80 px-3 backdrop-blur-xl transition-opacity sm:px-4',
          settings.focusMode && 'opacity-0 hover:opacity-100 focus-within:opacity-100',
        )}
      >
        <Link href="/bibliotheque" className="shrink-0 rounded-lg p-1 transition hover:bg-surface-2" aria-label="Bibliothèque">
          <LogoMark className="size-7" />
        </Link>
        <button
          type="button"
          onClick={() => (isDesktop ? setSettings((s) => ({ ...s, focusMode: false })) : setMobileSheet('chapters'))}
          className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-2 lg:pointer-events-none"
        >
          <ListTree className="size-4 shrink-0 text-muted lg:hidden" />
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold leading-tight">{ws.manuscript.title}</span>
            <span className="block truncate text-xs text-faint lg:hidden">
              {chapterIndex + 1}. {active?.title}
            </span>
          </span>
        </button>
        <SaveIndicator status={ws.status} lastSavedAt={ws.lastSavedAt} />

        <div className="ml-auto flex items-center gap-1">
          <Tooltip content={`${formatNumber(today)} / ${formatNumber(goal)} mots aujourd’hui${streak > 1 ? ` · ${streak} jours d’affilée` : ''}`}>
            <span className="mr-1 hidden items-center gap-2 sm:flex">
              <ProgressRing value={today / goal} size={30} stroke={3} label="Objectif du jour">
                <span className="text-[9px] font-semibold">{streak > 0 ? streak : ''}</span>
              </ProgressRing>
            </span>
          </Tooltip>
          <Tooltip content="Palette de commandes" shortcut="⌘K">
            <Button size="icon" variant="ghost" onClick={() => setPaletteOpen(true)} aria-label="Palette de commandes">
              <CommandIcon className="size-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Mode focus" shortcut="⌥F">
            <Button
              size="icon"
              variant="ghost"
              className={cn('hidden sm:inline-flex', settings.focusMode && 'bg-surface-2 text-text')}
              onClick={() => setSettings((s) => ({ ...s, focusMode: !s.focusMode }))}
              aria-label="Mode focus"
              aria-pressed={settings.focusMode}
            >
              <Focus className="size-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Liseuse">
            <Button size="icon" variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href={`/liseuse?m=${mid}`} aria-label="Liseuse">
                <BookOpen className="size-4" />
              </Link>
            </Button>
          </Tooltip>
          <Button size="sm" variant="secondary" onClick={() => setExportOpen(true)} className="hidden md:inline-flex">
            <Download className="size-3.5" /> Exporter
          </Button>
          {isDesktop && (
            <Tooltip content="Inspecteur">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSettings((s) => ({ ...s, inspector: !s.inspector, focusMode: false }))}
                aria-label="Afficher l’inspecteur"
                aria-pressed={inspectorVisible}
                className={cn(inspectorVisible && 'bg-surface-2 text-text')}
              >
                <PanelRight className="size-4" />
              </Button>
            </Tooltip>
          )}
          <div className="ml-1">
            <UserMenu mid={mid} />
          </div>
        </div>
      </header>

      <div
        className={cn(
          'grid transition-[grid-template-columns] duration-300',
          'lg:grid-cols-[264px_minmax(0,1fr)]',
          inspectorVisible && 'lg:grid-cols-[264px_minmax(0,1fr)_380px]',
          settings.focusMode && 'lg:grid-cols-[0px_minmax(0,1fr)]',
        )}
      >
        {/* ── Chapitres (bureau) ── */}
        <aside
          className={cn(
            'sticky top-14 hidden h-[calc(100dvh-3.5rem)] overflow-hidden border-r border-border/70 bg-surface-2/40 lg:block',
            settings.focusMode && 'invisible',
          )}
        >
          {sidebar}
        </aside>

        {/* ── Page ── */}
        <main className="min-w-0 px-5 pb-[45vh] pt-10 sm:px-8 lg:pt-16">
          {active && doc ? (
            <div className="mx-auto max-w-[720px]">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                Chapitre {chapterIndex + 1} · {formatNumber(active.wordCount)} mots
              </p>
              <ChapterTitle
                key={active.id}
                value={active.title}
                onChange={(title) => ws.activeId && ws.updateChapter(ws.activeId, { title })}
                onEnter={() => editor?.commands.focus('start')}
              />
              <ChapterEditor
                key={active.id}
                chapterId={active.id}
                initialDoc={active.doc}
                external={ws.external}
                settings={settings}
                onChange={onDocChange}
                onReady={setEditor}
                onNoteClick={(id) => {
                  setHighlightNote(id);
                  openTab('notes');
                }}
                onAnalyzeSelection={(t) => void analyze(t, 'selection')}
                onFactcheckSelection={(t) => void factcheck(t)}
                onAddFootnote={addFootnote}
              />
            </div>
          ) : (
            <EmptyState icon={<ListTree />} title="Aucun chapitre" action={<Button onClick={() => void ws.addChapter()}>Créer un chapitre</Button>} />
          )}
        </main>

        {/* ── Inspecteur (bureau) ── */}
        {inspectorVisible && (
          <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] border-l border-border/70 bg-surface/60 lg:block">
            {inspector}
          </aside>
        )}
      </div>

      {/* ── Dock de dictée ── */}
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4',
          isDesktop ? 'bottom-7' : 'bottom-[calc(env(safe-area-inset-bottom)+14px)]',
          isDesktop && inspectorVisible && 'lg:pr-[380px] lg:pl-[264px]',
          isDesktop && !inspectorVisible && !settings.focusMode && 'lg:pl-[264px]',
        )}
      >
        {isDesktop || dictation.state.phase !== 'idle' ? (
          <DictationDock
            state={dictation.state}
            maxSeconds={dictation.maxSeconds}
            onStart={startDictation}
            onStop={() => void dictation.stop()}
            onPause={dictation.pause}
            onResume={dictation.resume}
            onCancel={dictation.cancel}
          />
        ) : (
          <MobileBar
            pending={pendingSuggestions.length}
            onChapters={() => setMobileSheet('chapters')}
            onInspector={() => setMobileSheet('inspector')}
            onDictate={startDictation}
            onPalette={() => setPaletteOpen(true)}
            onAnalyze={() => {
              const t = selection();
              void analyze(t || (doc ? docToPlainText(doc) : ''), t ? 'selection' : 'chapter');
            }}
          />
        )}
      </div>

      {/* ── Feuilles mobiles ── */}
      {!isDesktop && (
        <>
          <Dialog open={mobileSheet === 'chapters'} onOpenChange={(o) => !o && setMobileSheet(null)}>
            <DialogContent title={ws.manuscript.title} side="left" className="p-0" hideTitle>
              <div className="-mx-5 -mb-5 -mt-4 h-[calc(100dvh-2rem)]">{sidebar}</div>
            </DialogContent>
          </Dialog>
          <Dialog open={mobileSheet === 'inspector'} onOpenChange={(o) => !o && setMobileSheet(null)}>
            <DialogContent title="Inspecteur" side="bottom" hideTitle className="h-[80dvh]">
              <div className="-mx-5 -mb-5 -mt-4 h-[calc(80dvh-2rem)]">{inspector}</div>
            </DialogContent>
          </Dialog>
        </>
      )}

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        actions={actions}
        chapters={ws.chapters.map((c) => (c.id === ws.activeId && doc ? { ...c, doc } : c))}
        onOpenChapter={ws.setActiveId}
        onSearchHit={onSearchHit}
      />

      <Dialog open={displayOpen} onOpenChange={setDisplayOpen}>
        <DialogContent title="Affichage" description="Réglages propres à cet appareil.">
          <DisplaySettings settings={settings} onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))} />
          <hr className="my-5 border-border" />
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>
              <span className="block font-medium">Objectif quotidien</span>
              <span className="text-muted">{formatNumber(goal)} mots par jour</span>
            </span>
            <input
              type="number"
              min={50}
              max={20000}
              step={50}
              defaultValue={goal}
              onBlur={(e) => {
                const v = Number(e.currentTarget.value);
                if (v >= 50 && v <= 20000) void saveProfile({ dailyGoal: v });
              }}
              className="h-9 w-24 rounded-lg border border-border bg-surface px-2 text-right"
              aria-label="Objectif quotidien en mots"
            />
          </label>
        </DialogContent>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent title="Raccourcis clavier">
          <ul className="divide-y divide-border text-sm">
            {[
              ['Palette de commandes', '⌘ K'],
              ['Dicter / insérer la dictée', '⌥ D'],
              ['Annuler la dictée', 'Échap'],
              ['Mode focus', '⌥ F'],
              ['Gras · Italique', '⌘ B · ⌘ I'],
              ['Annuler · Rétablir', '⌘ Z · ⌘ ⇧ Z'],
              ['Enregistrer maintenant', '⌘ S'],
              ['Guillemets français', 'tapez "'],
            ].map(([label, keys]) => (
              <li key={label} className="flex items-center justify-between py-2.5">
                <span>{label}</span>
                <Kbd className="h-6 px-2 text-xs">{keys}</Kbd>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {exportOpen && (
        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          uid={user.uid}
          manuscript={ws.manuscript}
          chapters={ws.chapters.map((c) => (c.id === ws.activeId && doc ? { ...c, doc } : c))}
        />
      )}
    </div>
  );
}

function chunkText(text: string, size: number): string[] {
  const paras = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let cur = '';
  for (const p of paras) {
    if ((cur + '\n\n' + p).length > size && cur) {
      chunks.push(cur);
      cur = p;
    } else cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function ChapterTitle({ value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter: () => void }) {
  const [v, setV] = useState(value);
  return (
    <textarea
      value={v}
      rows={1}
      onChange={(e) => {
        const next = e.target.value.replace(/\n/g, '');
        setV(next);
        onChange(next.trim() || 'Sans titre');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter();
        }
      }}
      aria-label="Titre du chapitre"
      placeholder="Titre du chapitre"
      maxLength={200}
      className="mb-8 w-full resize-none overflow-hidden bg-transparent font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.05] tracking-[-0.01em] outline-none placeholder:text-faint [field-sizing:content]"
    />
  );
}

function SaveIndicator({ status, lastSavedAt }: { status: SaveStatus; lastSavedAt: number | null }) {
  const map: Record<SaveStatus, { label: string; dot: string }> = {
    saved: { label: 'Enregistré', dot: 'bg-sage' },
    saving: { label: 'Enregistrement…', dot: 'bg-amber animate-pulse' },
    offline: { label: 'Hors ligne · enregistré sur l’appareil', dot: 'bg-faint' },
    error: { label: 'Échec de synchronisation', dot: 'bg-danger' },
  };
  const s = map[status];
  return (
    <Tooltip content={lastSavedAt ? `Dernière synchronisation ${formatRelative(lastSavedAt)}` : 'Synchronisé avec votre compte'}>
      <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-xs text-muted md:flex" role="status" aria-live="polite">
        <span className={cn('size-1.5 rounded-full', s.dot)} />
        {s.label}
      </span>
    </Tooltip>
  );
}

function DisplaySettings({
  settings,
  onChange,
}: {
  settings: EditorSettings;
  onChange: (patch: Partial<EditorSettings>) => void;
}) {
  return (
    <div className="space-y-5 text-sm">
      <div>
        <div className="mb-2 flex justify-between">
          <span className="font-medium">Taille du texte</span>
          <span className="text-muted">{settings.fontSize} px</span>
        </div>
        <Slider min={15} max={26} step={1} value={[settings.fontSize]} onValueChange={([v]) => onChange({ fontSize: v })} aria-label="Taille du texte" />
      </div>
      {(
        [
          ['focusMode', 'Mode focus', 'Estompe tout sauf le paragraphe en cours.'],
          ['typewriter', 'Machine à écrire', 'Garde la ligne courante au centre de l’écran.'],
          ['indent', 'Alinéas', 'Retrait de première ligne, comme dans un livre.'],
        ] as const
      ).map(([key, label, hint]) => (
        <label key={key} className="flex items-center justify-between gap-4">
          <span>
            <span className="block font-medium">{label}</span>
            <span className="text-muted">{hint}</span>
          </span>
          <Switch checked={settings[key]} onCheckedChange={(v) => onChange({ [key]: v })} />
        </label>
      ))}
    </div>
  );
}

function MobileBar({
  pending,
  onChapters,
  onInspector,
  onDictate,
  onPalette,
  onAnalyze,
}: {
  pending: number;
  onChapters: () => void;
  onInspector: () => void;
  onDictate: () => void;
  onPalette: () => void;
  onAnalyze: () => void;
}) {
  const item = 'flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-medium text-muted active:bg-surface-2 [&>svg]:size-5';
  return (
    <nav
      aria-label="Actions"
      className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-2xl border border-border bg-surface/95 p-1.5 shadow-pop backdrop-blur-md"
    >
      <button type="button" className={item} onClick={onChapters}>
        <ListTree /> Chapitres
      </button>
      <button type="button" className={item} onClick={onAnalyze}>
        <Sparkles /> Raturer
      </button>
      <button
        type="button"
        onClick={onDictate}
        aria-label="Dicter"
        className="-mt-7 grid size-16 shrink-0 place-items-center rounded-full bg-ember text-white shadow-[0_12px_28px_-8px_color-mix(in_oklab,var(--c-ember)_85%,transparent)] ring-4 ring-bg active:scale-95"
      >
        <Mic className="size-7" />
      </button>
      <button type="button" className={cn(item, 'relative')} onClick={onInspector}>
        <NotebookPen /> Panneau
        {pending > 0 && <span className="absolute right-3 top-1 rounded-full bg-iris px-1.5 text-[9px] text-white">{pending}</span>}
      </button>
      <button type="button" className={item} onClick={onPalette}>
        <CommandIcon /> Plus
      </button>
    </nav>
  );
}

function AtelierSkeleton() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Chargement de l’atelier">
      <div className="h-14 border-b border-border" />
      <div className="mx-auto max-w-[720px] space-y-4 px-6 pt-20">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-12 w-2/3" />
        <div className="skeleton mt-8 h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-4/5" />
      </div>
    </div>
  );
}
