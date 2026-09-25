'use client';

import { useState } from 'react';
import { BookmarkPlus, ExternalLink, Globe, Search } from 'lucide-react';
import type { ResearchResponse } from '@/lib/ai/contracts';
import { Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/misc';
import { SearchWidget } from './search-widget';

interface Props {
  onResearch: (query: string) => Promise<ResearchResponse | null>;
  onSave: (result: ResearchResponse, query: string) => void;
}

export function ResearchPanel({ onResearch, onSave }: Props) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ q: string; r: ResearchResponse } | null>(null);
  const [saved, setSaved] = useState(false);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setSaved(false);
    const r = await onResearch(q);
    if (r) setResult({ q, r });
    setBusy(false);
  };

  return (
    <div className="flex h-full flex-col">
      <form onSubmit={run} className="flex gap-2 px-4 pb-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex. : la vie à Lyon en 1832"
            className="pl-9"
            aria-label="Sujet de recherche"
            maxLength={500}
          />
        </div>
        <Button type="submit" size="md" variant="secondary" loading={busy} disabled={!query.trim()}>
          Chercher
        </Button>
      </form>

      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto px-4 pb-4">
        {!result && !busy && (
          <EmptyState icon={<Globe />} title="Recherche documentaire" className="py-8">
            Un dossier sourcé (Google Search) sur une époque, un lieu, un métier… pour nourrir votre récit sans quitter l’atelier.
          </EmptyState>
        )}
        {busy && (
          <div className="space-y-3 pt-2" aria-live="polite" aria-busy="true">
            <div className="h-4 w-3/4 skeleton" />
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-5/6 skeleton" />
            <div className="mt-4 h-20 w-full skeleton" />
          </div>
        )}
        {result && !busy && (
          <article className="space-y-4">
            <p className="font-serif text-[15px] leading-relaxed">{result.r.summary}</p>
            {result.r.keyPoints.length > 0 && (
              <ul className="space-y-2">
                {result.r.keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-2 text-[13.5px] leading-snug">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-iris" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
            {result.r.sources.length > 0 && (
              <div>
                <h4 className="mb-1.5 text-xs font-semibold tracking-wider text-faint uppercase">Sources</h4>
                <ul className="space-y-1">
                  {result.r.sources.map((s) => (
                    <li key={s.uri}>
                      <a
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex items-center gap-1.5 text-[13px] text-muted hover:text-text"
                      >
                        <ExternalLink className="size-3.5 shrink-0" /> <span className="truncate">{s.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.r.searchWidgetHtml && <SearchWidget html={result.r.searchWidgetHtml} />}
            <Button
              size="sm"
              variant={saved ? 'secondary' : 'primary'}
              disabled={saved}
              onClick={() => {
                onSave(result.r, result.q);
                setSaved(true);
              }}
            >
              <BookmarkPlus className="size-4" /> {saved ? 'Ajouté aux pense-bêtes' : 'Garder dans mes notes'}
            </Button>
          </article>
        )}
      </div>
    </div>
  );
}
