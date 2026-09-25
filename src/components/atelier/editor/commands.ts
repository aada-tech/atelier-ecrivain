import type { Editor } from '@tiptap/react';
import { findTextRanges } from './find';
import { joinDictation, splitParagraphs } from '@/lib/dictation/format';

/** Remplace la première occurrence d'un passage ; opération annulable (⌘Z). */
export function replaceInEditor(editor: Editor, original: string, replacement: string): boolean {
  const [range] = findTextRanges(editor.state.doc, original, { limit: 1 });
  if (!range) return false;
  const tr = editor.state.tr;
  if (replacement) tr.insertText(replacement, range.from, range.to);
  else tr.delete(range.from, range.to);
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export function hasText(editor: Editor, text: string): boolean {
  return findTextRanges(editor.state.doc, text, { limit: 1 }).length > 0;
}

export function revealText(editor: Editor, text: string, opts: { select?: boolean } = {}): boolean {
  const [range] = findTextRanges(editor.state.doc, text, { limit: 1 });
  if (!range) return false;
  if (opts.select) editor.chain().setTextSelection(range).run();
  requestAnimationFrame(() => {
    try {
      const dom = editor.view.domAtPos(range.from).node as HTMLElement;
      const el = dom.nodeType === Node.TEXT_NODE ? dom.parentElement : dom;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {}
  });
  return true;
}

/** Texte du paragraphe courant avant une position (raccord de dictée). */
export function textBefore(editor: Editor, pos: number): string {
  const $pos = editor.state.doc.resolve(Math.min(pos, editor.state.doc.content.size));
  return $pos.parent.textBetween(0, $pos.parentOffset, '\n', '');
}

/** Contexte : ~1200 caractères précédant le curseur. */
export function contextBefore(editor: Editor, pos: number, max = 1200): string {
  const start = Math.max(0, pos - max * 2);
  return editor.state.doc.textBetween(start, Math.min(pos, editor.state.doc.content.size), '\n\n', '').slice(-max);
}

/**
 * Insère un texte dicté à une position : raccord typographique avec le texte
 * précédent, un paragraphe par bloc « \n\n ».
 */
export function insertDictation(editor: Editor, pos: number, text: string) {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) return;
  const safePos = Math.min(Math.max(1, pos), editor.state.doc.content.size - 1);
  const first = joinDictation(textBefore(editor, safePos), paragraphs[0]);
  let chain = editor.chain().focus().setTextSelection(safePos).insertContent({ type: 'text', text: first });
  for (const p of paragraphs.slice(1)) {
    chain = chain.splitBlock().insertContent({ type: 'text', text: p });
  }
  chain.scrollIntoView().run();
}

export function insertFootnoteRef(editor: Editor, noteId: string) {
  const { to } = editor.state.selection;
  editor.chain().focus().setTextSelection(to).insertNoteRef(noteId).run();
}

export function removeNoteRefs(editor: Editor, noteId: string) {
  const tr = editor.state.tr;
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'noteRef' && node.attrs.id === noteId) positions.push(pos);
  });
  positions.reverse().forEach((pos) => tr.delete(pos, pos + 1));
  if (positions.length) editor.view.dispatch(tr);
}
