'use client';

import { useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { Dialog as D } from 'radix-ui';
import { FileText, Search } from 'lucide-react';
import type { Chapter } from '@/lib/doc/types';
import { docToPlainText } from '@/lib/doc/text';
import { normalizeForSearch } from './editor/find';
import { Kbd } from '@/components/ui/misc';

export interface PaletteAction {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  run: () => void;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: PaletteAction[];
  chapters: Chapter[];
  onOpenChapter: (id: string) => void;
  onSearchHit: (chapterId: string, query: string) => void;
}

export function CommandPalette({ open, onOpenChange, actions, chapters, onOpenChapter, onSearchHit }: Props) {
  const [query, setQuery] = useState('');

  const hits = useMemo(() => {
    const q = normalizeForSearch(query.trim(), true);
    if (q.length < 3) return [];
    const out: { chapter: Chapter; snippet: string; count: number }[] = [];
    for (const c of chapters) {
      const text = docToPlainText(c.doc);
      const norm = normalizeForSearch(text, true);
      let idx = norm.indexOf(q);
      if (idx === -1) continue;
      let count = 0;
      const first = idx;
      while (idx !== -1 && count < 99) {
        count++;
        idx = norm.indexOf(q, idx + q.length);
      }
      const start = Math.max(0, first - 40);
      const snippet = `${start > 0 ? '…' : ''}${text.slice(start, first + q.length + 60).replace(/\s+/g, ' ')}…`;
      out.push({ chapter: c, snippet, count });
    }
    return out.slice(0, 8);
  }, [query, chapters]);

  const groups = useMemo(() => {
    const map = new Map<string, PaletteAction[]>();
    for (const a of actions) map.set(a.group, [...(map.get(a.group) ?? []), a]);
    return [...map.entries()];
  }, [actions]);

  const close = () => {
    onOpenChange(false);
    setQuery('');
  };

  return (
    <D.Root open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]" />
        <D.Content
          className="fixed top-[12vh] left-1/2 z-50 w-[min(94vw,620px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-pop data-[state=open]:animate-[fade-up_0.2s_var(--ease-out-expo)]"
          aria-describedby={undefined}
        >
          <D.Title className="sr-only">Palette de commandes</D.Title>
          <Command label="Palette de commandes" loop>
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 text-faint" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Une action, un chapitre, un mot du manuscrit…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
              />
              <Kbd>Échap</Kbd>
            </div>
            <Command.List className="max-h-[min(60vh,440px)] scrollbar-thin overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted">Aucun résultat.</Command.Empty>

              {hits.length > 0 && (
                <Command.Group heading="Dans le manuscrit" className={GROUP}>
                  {hits.map((h) => (
                    <Command.Item
                      key={`hit-${h.chapter.id}`}
                      value={`hit ${h.chapter.title} ${query}`}
                      onSelect={() => {
                        onSearchHit(h.chapter.id, query.trim());
                        close();
                      }}
                      className={ITEM}
                    >
                      <Search className="size-4 text-amber" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {h.chapter.title}{' '}
                          <span className="font-normal text-faint">
                            · {h.count} occurrence{h.count > 1 ? 's' : ''}
                          </span>
                        </span>
                        <span className="block truncate font-serif text-[13px] text-muted">{h.snippet}</span>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {groups.map(([group, items]) => (
                <Command.Group key={group} heading={group} className={GROUP}>
                  {items.map((a) => (
                    <Command.Item
                      key={a.id}
                      value={`${a.label} ${a.keywords?.join(' ') ?? ''}`}
                      onSelect={() => {
                        close();
                        // Laisse la palette se fermer avant d'agir (focus éditeur).
                        requestAnimationFrame(a.run);
                      }}
                      className={ITEM}
                    >
                      <span className="grid size-4 place-items-center text-muted [&>svg]:size-4">{a.icon}</span>
                      <span className="flex-1">{a.label}</span>
                      {a.shortcut && <Kbd>{a.shortcut}</Kbd>}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}

              <Command.Group heading="Chapitres" className={GROUP}>
                {chapters.map((c, i) => (
                  <Command.Item
                    key={c.id}
                    value={`chapitre ${i + 1} ${c.title}`}
                    onSelect={() => {
                      onOpenChapter(c.id);
                      close();
                    }}
                    className={ITEM}
                  >
                    <FileText className="size-4 text-muted" />
                    <span className="flex-1 truncate">
                      <span className="mr-2 font-mono text-[11px] text-faint">{i + 1}</span>
                      {c.title}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

const GROUP =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-faint';
const ITEM =
  'flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-surface-2 data-[disabled=true]:opacity-50';
