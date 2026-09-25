import type {
  BlockNode,
  DocNode,
  InlineNode,
  MarkType,
  Note,
  ParagraphNode,
  TextNode,
} from './types';
import { EMPTY_DOC } from './types';

const MAX_TEXT_LENGTH = 200_000;
const ALLOWED_MARKS: ReadonlySet<string> = new Set(['bold', 'italic']);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sanitizeInline(nodes: unknown): InlineNode[] {
  if (!Array.isArray(nodes)) return [];
  const out: InlineNode[] = [];
  for (const node of nodes) {
    if (!isObject(node)) continue;
    if (node.type === 'text' && typeof node.text === 'string' && node.text.length > 0) {
      const text = node.text.slice(0, MAX_TEXT_LENGTH);
      const marks = Array.isArray(node.marks)
        ? node.marks
            .filter((m): m is { type: MarkType } => isObject(m) && typeof m.type === 'string' && ALLOWED_MARKS.has(m.type))
            .map((m) => ({ type: m.type }))
        : [];
      out.push(marks.length ? { type: 'text', text, marks } : { type: 'text', text });
    } else if (node.type === 'hardBreak') {
      out.push({ type: 'hardBreak' });
    } else if (node.type === 'noteRef' && isObject(node.attrs) && typeof node.attrs.id === 'string') {
      out.push({ type: 'noteRef', attrs: { id: node.attrs.id.slice(0, 64) } });
    }
  }
  return out;
}

function paragraph(content: InlineNode[]): ParagraphNode {
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
}

/**
 * Valide et normalise n'importe quelle entrée (Firestore, éditeur, import)
 * vers le schéma restreint. Les nœuds inconnus sont convertis en paragraphes
 * ou supprimés — jamais conservés tels quels.
 */
export function normalizeDoc(input: unknown): DocNode {
  if (!isObject(input) || !Array.isArray(input.content)) return structuredClone(EMPTY_DOC);
  const blocks: BlockNode[] = [];
  for (const node of input.content) {
    if (!isObject(node)) continue;
    switch (node.type) {
      case 'paragraph':
        blocks.push(paragraph(sanitizeInline(node.content)));
        break;
      case 'heading': {
        const level = isObject(node.attrs) && node.attrs.level === 3 ? 3 : 2;
        const content = sanitizeInline(node.content);
        blocks.push(content.length ? { type: 'heading', attrs: { level }, content } : { type: 'heading', attrs: { level } });
        break;
      }
      case 'blockquote': {
        const inner = Array.isArray(node.content) ? node.content : [];
        const paras = inner
          .filter(isObject)
          .map((p) => paragraph(sanitizeInline(p.type === 'paragraph' || p.type === 'heading' ? p.content : [])));
        blocks.push({ type: 'blockquote', content: paras.length ? paras : [{ type: 'paragraph' }] });
        break;
      }
      case 'horizontalRule':
        blocks.push({ type: 'horizontalRule' });
        break;
      default:
        // Nœud hors schéma (liste, code…) : on récupère le texte à plat.
        if (Array.isArray(node.content)) {
          const text = inlineText(node.content as unknown[]);
          if (text.trim()) blocks.push(paragraph([{ type: 'text', text }]));
        }
    }
  }
  return { type: 'doc', content: blocks.length ? blocks : [{ type: 'paragraph' }] };
}

function inlineText(nodes: unknown[]): string {
  let s = '';
  for (const n of nodes) {
    if (!isObject(n)) continue;
    if (typeof n.text === 'string') s += n.text;
    else if (Array.isArray(n.content)) s += inlineText(n.content as unknown[]) + ' ';
  }
  return s;
}

export function inlineToText(nodes: InlineNode[] | undefined, noteMarker?: (id: string) => string): string {
  if (!nodes) return '';
  let s = '';
  for (const n of nodes) {
    if (n.type === 'text') s += n.text;
    else if (n.type === 'hardBreak') s += '\n';
    else if (n.type === 'noteRef' && noteMarker) s += noteMarker(n.attrs.id);
  }
  return s;
}

/** Texte brut du document : un paragraphe par ligne vide. */
export function docToPlainText(doc: DocNode, noteMarker?: (id: string) => string): string {
  const parts: string[] = [];
  for (const block of doc.content) {
    if (block.type === 'horizontalRule') parts.push('* * *');
    else if (block.type === 'blockquote') parts.push(block.content.map((p) => inlineToText(p.content, noteMarker)).join('\n'));
    else parts.push(inlineToText(block.content, noteMarker));
  }
  return parts.filter((p) => p.trim().length > 0).join('\n\n');
}

const WORD_RE = /[\p{L}\p{N}]/u;

/** Compte de mots à la française : « l’homme » compte pour un mot. */
export function countWords(text: string): number {
  if (!text) return 0;
  let count = 0;
  for (const token of text.split(/\s+/)) {
    if (token && WORD_RE.test(token)) count++;
  }
  return count;
}

export function docWordCount(doc: DocNode): number {
  return countWords(docToPlainText(doc));
}

/** Ordre d'apparition des appels de note → numérotation 1..n. */
export function noteNumbering(doc: DocNode): Map<string, number> {
  const map = new Map<string, number>();
  const visit = (nodes: InlineNode[] | undefined) => {
    for (const n of nodes ?? []) {
      if (n.type === 'noteRef' && !map.has(n.attrs.id)) map.set(n.attrs.id, map.size + 1);
    }
  };
  for (const block of doc.content) {
    if (block.type === 'blockquote') block.content.forEach((p) => visit(p.content));
    else if (block.type !== 'horizontalRule') visit(block.content);
  }
  return map;
}

/** Texte brut → document (un paragraphe par bloc séparé d'une ligne vide). */
export function textToDoc(text: string): DocNode {
  const paras = text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paras.length) return structuredClone(EMPTY_DOC);
  return {
    type: 'doc',
    content: paras.map((p) => {
      const lines = p.split('\n');
      const content: InlineNode[] = [];
      lines.forEach((line, i) => {
        if (i > 0) content.push({ type: 'hardBreak' });
        if (line) content.push({ type: 'text', text: line });
      });
      return paragraph(content);
    }),
  };
}

export function textToParagraphs(text: string): ParagraphNode[] {
  return textToDoc(text).content as ParagraphNode[];
}

// ── Rendu neutre (liseuse, PDF, EPUB, Markdown) ────────────────────────────

export type Run =
  | { kind: 'text'; text: string; bold?: boolean; italic?: boolean }
  | { kind: 'break' }
  | { kind: 'note'; id: string; number: number };

export type RenderBlock =
  | { type: 'p' | 'h2' | 'h3' | 'quote'; runs: Run[] }
  | { type: 'scene-break' };

function toRuns(nodes: InlineNode[] | undefined, numbers: Map<string, number>): Run[] {
  const runs: Run[] = [];
  for (const n of nodes ?? []) {
    if (n.type === 'text') {
      const marks = new Set((n.marks ?? []).map((m) => m.type));
      runs.push({ kind: 'text', text: n.text, bold: marks.has('bold') || undefined, italic: marks.has('italic') || undefined });
    } else if (n.type === 'hardBreak') runs.push({ kind: 'break' });
    else if (n.type === 'noteRef') {
      const number = numbers.get(n.attrs.id);
      if (number) runs.push({ kind: 'note', id: n.attrs.id, number });
    }
  }
  return runs;
}

export function docToRenderBlocks(doc: DocNode, numbers = noteNumbering(doc)): RenderBlock[] {
  const out: RenderBlock[] = [];
  for (const b of doc.content) {
    if (b.type === 'horizontalRule') out.push({ type: 'scene-break' });
    else if (b.type === 'heading') out.push({ type: b.attrs.level === 3 ? 'h3' : 'h2', runs: toRuns(b.content, numbers) });
    else if (b.type === 'blockquote') b.content.forEach((p) => out.push({ type: 'quote', runs: toRuns(p.content, numbers) }));
    else {
      const runs = toRuns(b.content, numbers);
      if (runs.length) out.push({ type: 'p', runs });
    }
  }
  return out;
}

/** Notes de bas de page dans l'ordre de leurs appels. */
export function orderedFootnotes(doc: DocNode, notes: Note[]): { number: number; note: Note }[] {
  const numbers = noteNumbering(doc);
  return notes
    .filter((n) => n.kind === 'footnote' && numbers.has(n.id))
    .map((note) => ({ number: numbers.get(note.id)!, note }))
    .sort((a, b) => a.number - b.number);
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\*_`[\]#])/g, '\\$1');
}

function runsToMarkdown(runs: Run[]): string {
  return runs
    .map((r) => {
      if (r.kind === 'break') return '  \n';
      if (r.kind === 'note') return `[^${r.number}]`;
      let t = escapeMarkdown(r.text);
      if (r.italic) t = `*${t}*`;
      if (r.bold) t = `**${t}**`;
      return t;
    })
    .join('');
}

export function chapterToMarkdown(title: string, doc: DocNode, notes: Note[]): string {
  const blocks = docToRenderBlocks(doc);
  const body = blocks
    .map((b) => {
      if (b.type === 'scene-break') return '* * *';
      const text = runsToMarkdown(b.runs);
      if (b.type === 'h2') return `## ${text}`;
      if (b.type === 'h3') return `### ${text}`;
      if (b.type === 'quote') return `> ${text}`;
      return text;
    })
    .join('\n\n');
  const foot = orderedFootnotes(doc, notes)
    .map(({ number, note }) => `[^${number}]: ${note.text.replace(/\n+/g, ' ')}`)
    .join('\n');
  return `# ${escapeMarkdown(title)}\n\n${body}${foot ? `\n\n${foot}` : ''}\n`;
}

export function isDocEmpty(doc: DocNode): boolean {
  return docToPlainText(doc).trim().length === 0;
}

export type { TextNode };
