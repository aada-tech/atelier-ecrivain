'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Check, ExternalLink, Mic, ScanSearch, Sparkles, Undo2, X, ChevronDown } from 'lucide-react';
import type { Suggestion } from '@/lib/doc/types';
import { diffWords } from '@/lib/diff';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { hasText, replaceInEditor, revealText } from '../editor/commands';
import { setDecorations } from '../editor/extensions';

const KIND = {
  style: { label: 'Style', icon: Sparkles, tone: 'iris' as const },
  fact: { label: 'Fait', icon: ScanSearch, tone: 'sage' as const },
  dictation: { label: 'Dictée', icon: Mic, tone: 'ember' as const },
};

const VERDICT = {
  confirmed: { label: 'Confirmé', tone: 'sage' as const },
  caution: { label: 'À nuancer', tone: 'amber' as const },
  error: { label: 'Erreur probable', tone: 'danger' as const },
  unverified: { label: 'Non vérifié', tone: 'neutral' as const },
};

interface Props {
  suggestions: Suggestion[];
  editor: Editor | null;
  onChange: (next: Suggestion[]) => void;
  onAnalyzeChapter: () => void;
  onFactcheckChapter: () => void;
  busy: 'analyze' | 'factcheck' | null;
}

export function SuggestionsPanel({ suggestions, editor, onChange, onAnalyzeChapter, onFactcheckChapter, busy }: Props) {
  const [filter, setFilter] = useState<'all' | Suggestion['kind']>('all');
  const [showResolved, setShowResolved] = useState(false);
  const pending = suggestions.filter((s) => s.status === 'pending');
  const resolved = suggestions.filter((s) => s.status !== 'pending');
  const visible = filter === 'all' ? pending : pending.filter((s) => s.kind === filter);

  const setStatus = (id: string, status: Suggestion['status']) =>
    onChange(suggestions.map((s) => (s.id === id ? { ...s, status } : s)));

  const accept = (s: Suggestion) => {
    if (!editor) return;
    if (s.replacement && !replaceInEditor(editor, s.original, s.replacement)) return;
    setStatus(s.id, 'accepted');
  };

  const acceptAll = () => {
    if (!editor) return;
    const accepted = new Set<string>();
    for (const s of visible) {
      if (s.replacement && replaceInEditor(editor, s.original, s.replacement)) accepted.add(s.id);
    }
    onChange(suggestions.map((s) => (accepted.has(s.id) ? { ...s, status: 'accepted' } : s)));
  };

  const hover = (s: Suggestion | null) => {
    if (!editor) return;
    setDecorations(editor, { activeId: s?.id ?? null });
    if (s) revealText(editor, s.original);
  };

  const counts = { all: pending.length, style: 0, fact: 0, dictation: 0 };
  for (const s of pending) counts[s.kind]++;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-2 px-4 pb-3">
        <Button size="sm" variant="ai" onClick={onAnalyzeChapter} loading={busy === 'analyze'} disabled={!!busy}>
          <Sparkles className="size-3.5" /> Raturer le chapitre
        </Button>
        <Button size="sm" variant="secondary" onClick={onFactcheckChapter} loading={busy === 'factcheck'} disabled={!!busy}>
          <ScanSearch className="size-3.5" /> Vérifier les faits
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="flex items-center gap-1 border-y border-border px-3 py-2">
          {(['all', 'style', 'fact', 'dictation'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={cn(
                'h-7 rounded-md px-2.5 text-xs font-medium text-muted transition hover:text-text',
                filter === k && 'bg-surface-2 text-text',
              )}
            >
              {k === 'all' ? 'Tout' : KIND[k].label} <span className="text-faint">{counts[k]}</span>
            </button>
          ))}
          {visible.some((s) => s.replacement) && (
            <button type="button" onClick={acceptAll} className="ml-auto text-xs font-medium text-ember hover:underline">
              Tout appliquer
            </button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
        {visible.length === 0 && (
          <EmptyState icon={<Sparkles />} title="Aucune rature en attente" className="py-8">
            Sélectionnez un passage puis « Raturer », ou analysez tout le chapitre. Vos repentirs dictés apparaîtront aussi ici.
          </EmptyState>
        )}
        {visible.map((s) => (
          <SuggestionCard
            key={s.id}
            suggestion={s}
            found={editor ? hasText(editor, s.original) : true}
            onAccept={() => accept(s)}
            onReject={() => setStatus(s.id, 'rejected')}
            onHover={hover}
          />
        ))}

        {resolved.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center text-xs font-medium text-faint">
              <button
                type="button"
                onClick={() => setShowResolved((v) => !v)}
                aria-expanded={showResolved}
                className="flex items-center gap-2 hover:text-muted"
              >
                <ChevronDown className={cn('size-3.5 transition', showResolved && 'rotate-180')} />
                Historique ({resolved.length})
              </button>
              <button type="button" onClick={() => onChange(pending)} className="ml-auto hover:text-danger">
                Effacer
              </button>
            </div>
            {showResolved && (
              <ul className="mt-2 space-y-1.5">
                {resolved.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-2 text-xs text-muted">
                    {s.status === 'accepted' ? <Check className="size-3.5 text-sage" /> : <X className="size-3.5 text-faint" />}
                    <span className="flex-1 truncate">{s.replacement || s.original}</span>
                    {s.status === 'rejected' && (
                      <button type="button" onClick={() => setStatus(s.id, 'pending')} aria-label="Rétablir la suggestion">
                        <Undo2 className="size-3.5 hover:text-text" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SuggestionCard({
  suggestion: s,
  found = true,
  onAccept,
  onReject,
  onHover,
  className,
}: {
  suggestion: Suggestion;
  found?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onHover?: (s: Suggestion | null) => void;
  className?: string;
}) {
  const kind = KIND[s.kind];
  const Icon = kind.icon;
  const segments = s.replacement ? diffWords(s.original, s.replacement) : null;
  return (
    <article
      className={cn(
        'group rounded-xl border border-border bg-surface p-3.5 shadow-soft transition hover:border-border-strong',
        className,
      )}
      onMouseEnter={() => onHover?.(s)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(s)}
    >
      <header className="mb-2 flex items-center gap-2">
        <Badge tone={kind.tone}>
          <Icon /> {kind.label}
        </Badge>
        {s.verdict && <Badge tone={VERDICT[s.verdict].tone}>{VERDICT[s.verdict].label}</Badge>}
        {!found && <span className="ml-auto text-[11px] text-faint">Passage modifié</span>}
      </header>

      <p className="font-serif text-[15px] leading-relaxed" data-testid="suggestion-diff">
        {segments
          ? segments.map((seg, i) =>
              seg.type === 'same' ? (
                <span key={i}>{seg.text}</span>
              ) : seg.type === 'del' ? (
                <del key={i} className="rounded-sm bg-danger-soft/70 text-danger decoration-danger/60">
                  {seg.text}
                </del>
              ) : (
                <ins key={i} className="rounded-sm bg-sage-soft px-0.5 text-sage no-underline">
                  {seg.text}
                </ins>
              ),
            )
          : <span className="italic text-muted">« {s.original} »</span>}
      </p>

      {s.explanation && <p className="mt-2 text-[13px] leading-snug text-muted">{s.explanation}</p>}

      {s.sources && s.sources.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {s.sources.slice(0, 4).map((src) => (
            <li key={src.uri}>
              <a
                href={src.uri}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex max-w-[180px] items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted hover:border-border-strong hover:text-text"
              >
                <ExternalLink className="size-3 shrink-0" />
                <span className="truncate">{src.title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {(onAccept || onReject) && (
        <footer className="mt-3 flex gap-2">
          {s.replacement && onAccept && (
            <Button size="xs" variant="primary" onClick={onAccept} disabled={!found}>
              <Check className="size-3.5" /> Appliquer
            </Button>
          )}
          {!s.replacement && onAccept && (
            <Button size="xs" variant="secondary" onClick={onAccept}>
              <Check className="size-3.5" /> Vu
            </Button>
          )}
          {onReject && (
            <Button size="xs" variant="ghost" onClick={onReject}>
              Ignorer
            </Button>
          )}
        </footer>
      )}
    </article>
  );
}
