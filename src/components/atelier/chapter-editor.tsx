'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder, Focus } from '@tiptap/extensions';
import Typography from '@tiptap/extension-typography';
import { Bold, Italic, Quote, ScanSearch, Sparkles, StickyNote, Heading2 } from 'lucide-react';
import { AtelierDecorations, NoteRef } from './editor/extensions';
import { normalizeDoc } from '@/lib/doc/text';
import type { DocNode } from '@/lib/doc/types';
import type { ExternalDoc } from './use-workspace';
import { cn } from '@/lib/utils';

export interface EditorSettings {
  focusMode: boolean;
  typewriter: boolean;
  fontSize: number;
  indent: boolean;
}

interface Props {
  chapterId: string;
  initialDoc: DocNode;
  external: ExternalDoc | null;
  settings: EditorSettings;
  onChange: (doc: DocNode) => void;
  onReady: (editor: Editor | null) => void;
  onNoteClick: (noteId: string) => void;
  onAnalyzeSelection: (text: string) => void;
  onFactcheckSelection: (text: string) => void;
  onAddFootnote: () => void;
  readOnly?: boolean;
}

export function extensions(placeholder = 'Commencez à écrire… ou dictez avec le micro.') {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      link: false,
    }),
    Placeholder.configure({ placeholder }),
    Focus.configure({ className: 'has-focus', mode: 'shallowest' }),
    Typography.configure({
      openDoubleQuote: '« ',
      closeDoubleQuote: ' »',
      openSingleQuote: '‘',
      closeSingleQuote: '’',
    }),
    NoteRef,
    AtelierDecorations,
  ];
}

export function ChapterEditor({
  chapterId,
  initialDoc,
  external,
  settings,
  onChange,
  onReady,
  onNoteClick,
  onAnalyzeSelection,
  onFactcheckSelection,
  onAddFootnote,
  readOnly,
}: Props) {
  const changeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbs = useRef({ onChange, onNoteClick, typewriter: settings.typewriter });
  useEffect(() => {
    cbs.current = { onChange, onNoteClick, typewriter: settings.typewriter };
  });

  const editor = useEditor({
    extensions: extensions(),
    content: initialDoc,
    immediatelyRender: false,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'manuscript-prose',
        spellcheck: 'true',
        lang: 'fr',
        'aria-label': 'Texte du chapitre',
        'aria-multiline': 'true',
        role: 'textbox',
      },
      handleClickOn(_view, _pos, node) {
        if (node.type.name === 'noteRef') {
          cbs.current.onNoteClick(node.attrs.id);
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor: e }) {
      if (changeTimer.current) clearTimeout(changeTimer.current);
      changeTimer.current = setTimeout(() => cbs.current.onChange(normalizeDoc(e.getJSON())), 250);
      if (cbs.current.typewriter) centerCaret(e);
    },
    onSelectionUpdate({ editor: e }) {
      if (cbs.current.typewriter) centerCaret(e);
    },
  });

  useEffect(() => {
    onReady(editor);
    return () => onReady(null);
  }, [editor, onReady]);

  // Flush immédiat au démontage (changement de chapitre, fermeture).
  useEffect(() => {
    return () => {
      if (changeTimer.current && editor && !editor.isDestroyed) {
        clearTimeout(changeTimer.current);
        cbs.current.onChange(normalizeDoc(editor.getJSON()));
      }
    };
  }, [editor]);

  // Mise à jour venue d'un autre appareil.
  const lastExternal = useRef(0);
  useEffect(() => {
    if (!editor || !external || external.chapterId !== chapterId || external.version === lastExternal.current) return;
    lastExternal.current = external.version;
    const { from } = editor.state.selection;
    editor.commands.setContent(external.doc, { emitUpdate: false });
    const max = editor.state.doc.content.size;
    editor.commands.setTextSelection(Math.min(from, max - 1));
  }, [editor, external, chapterId]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  return (
    <div
      className={cn('relative', settings.focusMode && 'focus-paragraphs')}
      style={{ ['--prose-size' as string]: `${settings.fontSize}px` }}
    >
      {editor && !readOnly && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top', offset: 10 }}
          shouldShow={({ editor: e, from, to }) => from !== to && !e.isActive('noteRef') && e.isEditable}
          className="z-30 flex items-center gap-0.5 rounded-xl border border-border bg-surface p-1 shadow-lift"
        >
          <BubbleButton label="Gras" shortcut="⌘B" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold />
          </BubbleButton>
          <BubbleButton label="Italique" shortcut="⌘I" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic />
          </BubbleButton>
          <BubbleButton label="Intertitre" active={editor.isActive('heading')} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 />
          </BubbleButton>
          <BubbleButton label="Citation" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote />
          </BubbleButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <BubbleButton label="Note de bas de page" onClick={onAddFootnote}>
            <StickyNote />
          </BubbleButton>
          <button
            type="button"
            onClick={() => onAnalyzeSelection(selectedText(editor))}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-iris transition hover:bg-iris-soft"
          >
            <Sparkles className="size-3.5" /> Raturer
          </button>
          <button
            type="button"
            onClick={() => onFactcheckSelection(selectedText(editor))}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-sage transition hover:bg-sage-soft"
          >
            <ScanSearch className="size-3.5" /> Vérifier
          </button>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function BubbleButton({
  label,
  shortcut,
  active,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text [&>svg]:size-4',
        active && 'bg-surface-2 text-text',
      )}
    >
      {children}
    </button>
  );
}

export function selectedText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, '\n\n', '').trim();
}

function centerCaret(editor: Editor) {
  requestAnimationFrame(() => {
    if (editor.isDestroyed) return;
    try {
      const coords = editor.view.coordsAtPos(editor.state.selection.head);
      const target = window.innerHeight * 0.42;
      const delta = coords.top - target;
      if (Math.abs(delta) > 24) window.scrollBy({ top: delta, behavior: 'smooth' });
    } catch {
      /* position hors vue */
    }
  });
}
