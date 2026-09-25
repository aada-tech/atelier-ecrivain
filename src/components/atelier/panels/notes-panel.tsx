'use client';

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ExternalLink, LocateFixed, NotebookPen, Plus, StickyNote, Trash2 } from 'lucide-react';
import type { DocNode, Note } from '@/lib/doc/types';
import { noteNumbering } from '@/lib/doc/text';
import { Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/misc';
import { cn, createId } from '@/lib/utils';
import { insertFootnoteRef, removeNoteRefs } from '../editor/commands';

interface Props {
  notes: Note[];
  doc: DocNode;
  editor: Editor | null;
  highlightedId: string | null;
  onChange: (notes: Note[]) => void;
}

export function NotesPanel({ notes, doc, editor, highlightedId, onChange }: Props) {
  const numbers = noteNumbering(doc);
  const footnotes = notes
    .filter((n) => n.kind === 'footnote' && numbers.has(n.id))
    .sort((a, b) => numbers.get(a.id)! - numbers.get(b.id)!);
  const orphans = notes.filter((n) => n.kind === 'footnote' && !numbers.has(n.id));
  const memos = notes.filter((n) => n.kind === 'memo');

  const update = (id: string, patch: Partial<Note>) => onChange(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const remove = (id: string) => {
    if (editor) removeNoteRefs(editor, id);
    onChange(notes.filter((n) => n.id !== id));
  };
  const addMemo = () =>
    onChange([...notes, { id: createId('n'), kind: 'memo', text: '', source: 'manual', createdAt: Date.now() }]);
  const addFootnote = () => {
    if (!editor) return;
    const id = createId('n');
    onChange([...notes, { id, kind: 'footnote', text: '', source: 'manual', createdAt: Date.now() }]);
    insertFootnoteRef(editor, id);
  };
  const locate = (id: string) => {
    if (!editor) return;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'noteRef' && node.attrs.id === id) {
        editor.chain().focus().setNodeSelection(pos).scrollIntoView().run();
        return false;
      }
      return true;
    });
  };

  return (
    <div className="h-full space-y-6 overflow-y-auto p-4 scrollbar-thin">
      <section>
        <header className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">Notes de bas de page</h3>
          <Button size="xs" variant="ghost" onClick={addFootnote} disabled={!editor}>
            <Plus className="size-3.5" /> Au curseur
          </Button>
        </header>
        {footnotes.length === 0 && orphans.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-[13px] text-muted">
            Sélectionnez un mot puis <StickyNote className="inline size-3.5" /> pour appeler une note. La numérotation est automatique.
          </p>
        )}
        <ol className="space-y-2">
          {footnotes.map((n) => (
            <NoteItem
              key={n.id}
              note={n}
              label={String(numbers.get(n.id))}
              highlighted={highlightedId === n.id}
              onText={(text) => update(n.id, { text })}
              onDelete={() => remove(n.id)}
              onLocate={() => locate(n.id)}
            />
          ))}
          {orphans.map((n) => (
            <NoteItem
              key={n.id}
              note={n}
              label="–"
              hint="Appel supprimé du texte"
              highlighted={false}
              onText={(text) => update(n.id, { text })}
              onDelete={() => remove(n.id)}
              onConvert={() => update(n.id, { kind: 'memo' })}
            />
          ))}
        </ol>
      </section>

      <section>
        <header className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">Pense-bêtes</h3>
          <Button size="xs" variant="ghost" onClick={addMemo}>
            <Plus className="size-3.5" /> Ajouter
          </Button>
        </header>
        {memos.length === 0 ? (
          <EmptyState icon={<NotebookPen />} title="Carnet vide" className="py-6">
            Idées, pistes à creuser, résultats de recherche : tout ce qui ne va pas (encore) dans le texte.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {memos.map((n) => (
              <NoteItem
                key={n.id}
                note={n}
                highlighted={highlightedId === n.id}
                onText={(text) => update(n.id, { text })}
                onDelete={() => remove(n.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NoteItem({
  note,
  label,
  hint,
  highlighted,
  onText,
  onDelete,
  onLocate,
  onConvert,
}: {
  note: Note;
  label?: string;
  hint?: string;
  highlighted: boolean;
  onText: (t: string) => void;
  onDelete: () => void;
  onLocate?: () => void;
  onConvert?: () => void;
}) {
  const [value, setValue] = useState(note.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (document.activeElement !== ref.current) setValue(note.text);
  }, [note.text]);

  useEffect(() => {
    if (highlighted) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ref.current?.focus({ preventScroll: true });
    }
  }, [highlighted]);

  const commit = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onText(text), 400);
  };

  return (
    <li
      className={cn(
        'group rounded-xl border border-border bg-surface p-2.5 transition',
        highlighted && 'border-iris ring-4 ring-iris/15',
      )}
    >
      <div className="flex gap-2">
        {label && (
          <span className="mt-1.5 grid size-5 shrink-0 place-items-center rounded-md bg-ember-soft font-mono text-[11px] font-semibold text-ember">
            {label}
          </span>
        )}
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => onText(value)}
          placeholder={note.kind === 'footnote' ? 'Texte de la note…' : 'Une idée, une piste…'}
          aria-label={label ? `Note ${label}` : 'Pense-bête'}
          className="min-h-16 resize-none border-transparent bg-transparent px-1 py-1 font-serif text-[14px] shadow-none focus:border-transparent focus:ring-0"
          rows={Math.min(8, Math.max(2, Math.ceil(value.length / 42)))}
        />
      </div>
      {note.links && note.links.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-1.5 pl-1">
          {note.links.slice(0, 6).map((l) => (
            <li key={l.uri}>
              <a
                href={l.uri}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex max-w-[170px] items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted hover:text-text"
              >
                <ExternalLink className="size-3 shrink-0" /> <span className="truncate">{l.title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1 flex items-center gap-1 pl-1 text-[11px] text-faint opacity-70 transition group-focus-within:opacity-100 group-hover:opacity-100">
        {hint && <span>{hint}</span>}
        {note.source !== 'manual' && <span>{note.source === 'research' ? 'Recherche' : 'IA'}</span>}
        <span className="ml-auto flex gap-0.5">
          {onConvert && (
            <button type="button" onClick={onConvert} className="rounded px-1.5 py-0.5 hover:bg-surface-2 hover:text-text">
              En pense-bête
            </button>
          )}
          {onLocate && (
            <button type="button" onClick={onLocate} className="grid size-6 place-items-center rounded hover:bg-surface-2 hover:text-text" aria-label="Aller à l’appel de note">
              <LocateFixed className="size-3.5" />
            </button>
          )}
          <button type="button" onClick={onDelete} className="grid size-6 place-items-center rounded hover:bg-danger-soft hover:text-danger" aria-label="Supprimer la note">
            <Trash2 className="size-3.5" />
          </button>
        </span>
      </div>
    </li>
  );
}
