'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, History, RotateCcw, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { Chapter } from '@/lib/doc/types';
import { createSnapshot, deleteSnapshot, listDeletedChapterSnapshots, listSnapshots, type Snapshot } from '@/lib/data/snapshots';
import { docToRenderBlocks } from '@/lib/doc/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, Badge } from '@/components/ui/misc';
import { ProseView } from '@/components/manuscript/prose-view';
import { formatNumber, formatRelative } from '@/lib/utils';

interface Props {
  uid: string;
  mid: string;
  chapter: Chapter;
  chapterIds: string[];
  onRestore: (snapshot: Snapshot) => void;
  onRestoreDeleted: (snapshot: Snapshot) => void;
}

export function VersionsPanel({ uid, mid, chapter, chapterIds, onRestore, onRestoreDeleted }: Props) {
  const [list, setList] = useState<Snapshot[] | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Snapshot | null>(null);
  const [trash, setTrash] = useState<Snapshot[]>([]);
  const idsKey = chapterIds.join(',');

  const refresh = useCallback(async () => {
    try {
      setList(await listSnapshots(uid, mid, chapter.id));
    } catch {
      setList([]);
    }
  }, [uid, mid, chapter.id]);

  useEffect(() => {
    let alive = true;
    listSnapshots(uid, mid, chapter.id)
      .then((l) => alive && setList(l))
      .catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, [uid, mid, chapter.id]);

  useEffect(() => {
    listDeletedChapterSnapshots(uid, mid, new Set(idsKey.split(',')))
      .then(setTrash)
      .catch(() => setTrash([]));
  }, [uid, mid, idsKey]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createSnapshot(
        uid,
        mid,
        chapter,
        label.trim() || `Version du ${new Date().toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}`,
      );
      setLabel('');
      toast.success('Instantané enregistré');
      await refresh();
    } catch {
      toast.error('Impossible d’enregistrer l’instantané');
    } finally {
      setBusy(false);
    }
  };

  const restore = async (s: Snapshot) => {
    await createSnapshot(uid, mid, chapter, 'Avant restauration', true).catch(() => {});
    onRestore(s);
    setPreview(null);
    toast.success('Version restaurée — l’état précédent a été archivé.');
    void refresh();
  };

  return (
    <div className="flex h-full flex-col">
      <form onSubmit={create} className="flex gap-2 px-4 pb-3">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nom de la version (facultatif)"
          maxLength={120}
          aria-label="Nom de la version"
        />
        <Button type="submit" variant="secondary" loading={busy}>
          <Camera className="size-4" /> Figer
        </Button>
      </form>
      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto px-4 pb-4">
        {list === null && <div className="h-16 w-full skeleton" />}
        {list?.length === 0 && (
          <EmptyState icon={<History />} title="Aucune version" className="py-8">
            Figez un état du chapitre avant une réécriture : vous pourrez toujours y revenir. Les suppressions et conflits sont archivés
            automatiquement.
          </EmptyState>
        )}
        <ul className="space-y-2">
          {list?.map((s) => (
            <li key={s.id} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{s.label || s.title}</p>
                <p className="text-xs text-faint">
                  {formatRelative(s.createdAt)} · {formatNumber(s.wordCount)} mots {s.auto && <Badge className="ml-1">auto</Badge>}
                </p>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={() => setPreview(s)} aria-label="Aperçu">
                <Eye className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Supprimer la version"
                onClick={async () => {
                  await deleteSnapshot(uid, mid, s.id);
                  void refresh();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>

        {trash.length > 0 && (
          <section className="mt-6">
            <h3 className="mb-2 text-xs font-semibold tracking-wider text-faint uppercase">Chapitres supprimés</h3>
            <ul className="space-y-2">
              {trash.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{s.title}</p>
                    <p className="text-xs text-faint">
                      {formatRelative(s.createdAt)} · {formatNumber(s.wordCount)} mots
                    </p>
                  </div>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      onRestoreDeleted(s);
                      setTrash((t) => t.filter((x) => x.id !== s.id));
                    }}
                  >
                    <RotateCcw className="size-3.5" /> Rétablir
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        {preview && (
          <DialogContent
            title={preview.label || 'Version'}
            description={`${formatRelative(preview.createdAt)} · ${formatNumber(preview.wordCount)} mots`}
            className="w-[min(94vw,760px)]"
          >
            <div className="rounded-xl bg-paper p-6">
              <ProseView blocks={docToRenderBlocks(preview.doc)} />
            </div>
            <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-surface pt-3">
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Fermer
              </Button>
              <Button onClick={() => void restore(preview)}>
                <RotateCcw className="size-4" /> Restaurer cette version
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
