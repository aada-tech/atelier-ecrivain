import type { BlockNode, DocNode, InlineNode, MarkType } from './doc/types';
import { EMPTY_DOC } from './doc/types';

/** Markdown léger → nœuds inline (gras **x**, italique *x* ou _x_). */
export function parseInline(text: string): InlineNode[] {
  const out: InlineNode[] = [];
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const push = (t: string, marks: MarkType[] = []) => {
    if (!t) return;
    const clean = t.replace(/\\([\\*_`[\]#])/g, '$1');
    out.push(marks.length ? { type: 'text', text: clean, marks: marks.map((type) => ({ type })) } : { type: 'text', text: clean });
  };
  while ((m = re.exec(text))) {
    if (m.index > last) push(text.slice(last, m.index));
    if (m[2] ?? m[3]) push(m[2] ?? m[3], ['bold']);
    else push(m[4] ?? m[5], ['italic']);
    last = m.index + m[0].length;
  }
  push(text.slice(last));
  return out;
}

function blocksFrom(lines: string[]): BlockNode[] {
  const blocks: BlockNode[] = [];
  const paras = lines.join('\n').split(/\n\s*\n/);
  for (const raw of paras) {
    const p = raw.trim();
    if (!p) continue;
    if (/^(\*\s*\*\s*\*|---|⁂|\*\*\*)$/.test(p)) blocks.push({ type: 'horizontalRule' });
    else if (/^###\s+/.test(p)) blocks.push({ type: 'heading', attrs: { level: 3 }, content: parseInline(p.replace(/^###\s+/, '')) });
    else if (/^##\s+/.test(p)) blocks.push({ type: 'heading', attrs: { level: 2 }, content: parseInline(p.replace(/^##\s+/, '')) });
    else if (/^>\s?/.test(p)) {
      blocks.push({ type: 'blockquote', content: [{ type: 'paragraph', content: parseInline(p.replace(/^>\s?/gm, '').replace(/\n/g, ' ')) }] });
    } else blocks.push({ type: 'paragraph', content: parseInline(p.replace(/\s*\n\s*/g, ' ')) });
  }
  return blocks;
}

export interface ImportedChapter {
  title: string;
  doc: DocNode;
}

/**
 * Découpe un texte (.txt / .md) en chapitres : titres « # », ou lignes
 * « Chapitre N », sinon un seul chapitre.
 */
export function importText(source: string, fallbackTitle = 'Chapitre 1'): ImportedChapter[] {
  const text = source.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const lines = text.split('\n');
  const isHeading = (l: string) => /^#\s+\S/.test(l) || /^(chapitre|chapter)\s+([0-9]+|[ivxlcdm]+)\b/i.test(l.trim());
  const chapters: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of lines) {
    if (isHeading(line)) {
      current = { title: line.replace(/^#\s+/, '').trim().slice(0, 200), lines: [] };
      chapters.push(current);
    } else {
      if (!current) {
        current = { title: fallbackTitle, lines: [] };
        chapters.push(current);
      }
      current.lines.push(line);
    }
  }
  const result = chapters
    .map((c) => {
      const content = blocksFrom(c.lines);
      return { title: c.title, doc: content.length ? { type: 'doc' as const, content } : structuredClone(EMPTY_DOC) };
    })
    .filter((c, i, all) => all.length === 1 || c.doc.content.some((b) => b.type !== 'paragraph' || (b.content?.length ?? 0) > 0) || c.title !== fallbackTitle);
  return result.length ? result.slice(0, 200) : [{ title: fallbackTitle, doc: structuredClone(EMPTY_DOC) }];
}
