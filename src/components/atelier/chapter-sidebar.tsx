'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, CircleDot, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Chapter, ChapterStatus } from '@/lib/doc/types';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/ui/misc';
import { cn, formatNumber } from '@/lib/utils';

export const STATUS: Record<ChapterStatus, { label: string; className: string }> = {
  draft: { label: 'Premier jet', className: 'bg-faint' },
  revision: { label: 'En révision', className: 'bg-amber' },
  final: { label: 'Finalisé', className: 'bg-sage' },
};

interface Props {
  chapters: Chapter[];
  activeId: string | null;
  totalWords: number;
  targetWords?: number;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, title: string) => void;
  onStatus: (id: string, status: ChapterStatus) => void;
  onMove: (id: string, toIndex: number) => void;
  onDelete: (id: string) => void;
}

export function ChapterSidebar({ chapters, activeId, totalWords, targetWords, onSelect, onAdd, onRename, onStatus, onMove, onDelete }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<Chapter | null>(null);

  return (
    <nav aria-label="Chapitres" className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">Chapitres</h2>
        <Button size="icon-sm" variant="ghost" onClick={onAdd} aria-label="Nouveau chapitre">
          <Plus className="size-4" />
        </Button>
      </div>

      <ol className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4 scrollbar-thin">
        {chapters.map((c, i) => {
          const active = c.id === activeId;
          return (
            <li
              key={c.id}
              draggable={editing !== c.id}
              onDragStart={(e) => {
                setDragId(c.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverIndex(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && overIndex !== null) onMove(dragId, overIndex);
                setDragId(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverIndex(null);
              }}
              className={cn(
                'group relative rounded-lg transition',
                overIndex === i && dragId && dragId !== c.id && 'before:absolute before:inset-x-2 before:-top-px before:h-0.5 before:rounded-full before:bg-ember',
                dragId === c.id && 'opacity-40',
              )}
            >
              {editing === c.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = new FormData(e.currentTarget).get('title');
                    if (typeof v === 'string' && v.trim()) onRename(c.id, v.trim());
                    setEditing(null);
                  }}
                  className="px-1 py-1"
                >
                  <input
                    name="title"
                    defaultValue={c.title}
                    autoFocus
                    maxLength={200}
                    onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                    onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                    aria-label="Titre du chapitre"
                    className="h-9 w-full rounded-md border border-iris bg-surface px-2 text-sm outline-none ring-4 ring-iris/15"
                  />
                </form>
              ) : (
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-lg pr-1 transition',
                    active ? 'bg-surface text-text shadow-soft ring-1 ring-border' : 'text-muted hover:bg-surface-2/70 hover:text-text',
                  )}
                >
                  <GripVertical className="ml-1 hidden size-3.5 shrink-0 cursor-grab text-faint opacity-0 group-hover:opacity-100 md:block" aria-hidden />
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    onDoubleClick={() => setEditing(c.id)}
                    aria-current={active ? 'page' : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-1.5 text-left"
                  >
                    <span className="w-5 shrink-0 text-right font-mono text-[11px] text-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{c.title}</span>
                      <span className="flex items-center gap-1.5 text-[11px] text-faint">
                        <span className={cn('size-1.5 rounded-full', STATUS[c.status].className)} />
                        {formatNumber(c.wordCount)} mots
                        {c.suggestions.some((s) => s.status === 'pending') && (
                          <span className="text-iris">· {c.suggestions.filter((s) => s.status === 'pending').length} ratures</span>
                        )}
                      </span>
                    </span>
                  </button>
                  <Menu>
                    <MenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Actions pour ${c.title}`}
                        className="grid size-7 shrink-0 place-items-center rounded-md text-faint opacity-0 transition hover:bg-surface-2 hover:text-text focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </MenuTrigger>
                    <MenuContent align="start">
                      <MenuItem icon={<Pencil />} onSelect={() => setEditing(c.id)}>
                        Renommer
                      </MenuItem>
                      <MenuItem icon={<ArrowUp />} disabled={i === 0} onSelect={() => onMove(c.id, i - 1)}>
                        Monter
                      </MenuItem>
                      <MenuItem icon={<ArrowDown />} disabled={i === chapters.length - 1} onSelect={() => onMove(c.id, i + 1)}>
                        Descendre
                      </MenuItem>
                      <MenuSeparator />
                      <MenuLabel>Statut</MenuLabel>
                      {(Object.keys(STATUS) as ChapterStatus[]).map((s) => (
                        <MenuItem
                          key={s}
                          icon={<CircleDot className={cn(c.status === s ? 'text-ember' : 'text-faint')} />}
                          onSelect={() => onStatus(c.id, s)}
                        >
                          {STATUS[s].label}
                        </MenuItem>
                      ))}
                      <MenuSeparator />
                      <MenuItem icon={<Trash2 />} tone="danger" disabled={chapters.length <= 1} onSelect={() => setConfirm(c)}>
                        Supprimer
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {targetWords ? (
            <ProgressRing value={totalWords / targetWords} size={34} label="Progression du manuscrit" />
          ) : null}
          <div className="text-xs leading-tight">
            <p className="font-medium text-text">{formatNumber(totalWords)} mots</p>
            <p className="text-faint">
              {targetWords ? `objectif ${formatNumber(targetWords)}` : `≈ ${Math.max(1, Math.round(totalWords / 250))} pages`}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        {confirm && (
          <DialogContent title="Supprimer ce chapitre ?" description={`« ${confirm.title} » sera retiré du manuscrit. Une copie est conservée dans les versions.`}>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onDelete(confirm.id);
                  setConfirm(null);
                }}
              >
                Supprimer
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </nav>
  );
}
