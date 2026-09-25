'use client';

import { Check, ExternalLink, Mic, ScanSearch, Sparkles } from 'lucide-react';
import type { Suggestion } from '@/lib/doc/types';
import { diffWords } from '@/lib/diff';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

export const SUGGESTION_KIND = {
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

/** Carte de rature : diff mot à mot, verdict, sources. Utilisée dans l'atelier ET dans les démos. */
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
  const kind = SUGGESTION_KIND[s.kind];
  const Icon = kind.icon;
  const segments = s.replacement ? diffWords(s.original, s.replacement) : null;
  return (
    <article
      className={cn('group rounded-xl border border-border bg-surface p-3.5 shadow-soft transition hover:border-border-strong', className)}
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
        {segments ? (
          segments.map((seg, i) =>
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
        ) : (
          <span className="text-muted italic">« {s.original} »</span>
        )}
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
