/**
 * Migration des chapitres créés par la v1 de l'Atelier.
 *
 * La v1 stockait `blocks[].content` sous forme de HTML issu d'un
 * contentEditable (non assaini), des appels de note en chiffres exposants
 * Unicode (¹²³) et des révisions dans `pendingReviews`. On convertit tout vers
 * le schéma v2 sans jamais interpréter ce HTML dans un DOM.
 */

import type { BlockNode, Chapter, ChapterStatus, DocNode, InlineNode, Note, Suggestion, SuggestionStatus } from './types';
import { CURRENT_SCHEMA } from './types';
import { docWordCount, normalizeDoc } from './text';

const SUPERSCRIPT_TO_DIGIT: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};
const SUPERSCRIPT_RE = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  laquo: '«',
  raquo: '»',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  ecirc: 'ê',
  ocirc: 'ô',
  icirc: 'î',
  ucirc: 'û',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  br?: boolean;
}

/** Convertit un fragment HTML (legacy) en segments de texte typés. */
export function htmlToRuns(html: string): Run[] {
  const runs: Run[] = [];
  let bold = 0;
  let italic = 0;
  let skip = 0; // contenu de <script>/<style> ignoré
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>|<!--[\s\S]*?-->|([^<]+)|</g;
  let m: RegExpExecArray | null;
  const pushBreak = () => {
    if (runs.length && !runs[runs.length - 1].br) runs.push({ text: '', bold: false, italic: false, br: true });
  };
  while ((m = re.exec(html))) {
    const [, closing, rawTag, , text] = m;
    if (text !== undefined) {
      if (!skip) runs.push({ text: decodeEntities(text), bold: bold > 0, italic: italic > 0 });
      continue;
    }
    if (!rawTag) continue;
    const tag = rawTag.toLowerCase();
    const isClose = closing === '/';
    if (tag === 'script' || tag === 'style') {
      skip += isClose ? -1 : 1;
      skip = Math.max(0, skip);
    } else if (tag === 'b' || tag === 'strong') bold += isClose ? -1 : 1;
    else if (tag === 'i' || tag === 'em') italic += isClose ? -1 : 1;
    else if (tag === 'br') pushBreak();
    else if ((tag === 'div' || tag === 'p') && !isClose) pushBreak();
    bold = Math.max(0, bold);
    italic = Math.max(0, italic);
  }
  // Retire les sauts de ligne en tête/fin.
  while (runs.length && runs[0].br) runs.shift();
  while (runs.length && runs[runs.length - 1].br) runs.pop();
  return runs;
}

function runsToInline(runs: Run[], resolveNote: (n: number) => string | null): InlineNode[] {
  const out: InlineNode[] = [];
  for (const run of runs) {
    if (run.br) {
      out.push({ type: 'hardBreak' });
      continue;
    }
    const text = run.text.replace(/ /g, ' ');
    let last = 0;
    for (const match of text.matchAll(SUPERSCRIPT_RE)) {
      const idx = match.index ?? 0;
      const digits = match[0]
        .split('')
        .map((c) => SUPERSCRIPT_TO_DIGIT[c])
        .join('');
      const noteId = resolveNote(parseInt(digits, 10));
      if (!noteId) continue;
      if (idx > last) out.push(textNode(text.slice(last, idx), run));
      out.push({ type: 'noteRef', attrs: { id: noteId } });
      last = idx + match[0].length;
    }
    if (last < text.length) out.push(textNode(text.slice(last), run));
  }
  return out.filter((n) => n.type !== 'text' || n.text.length > 0);
}

function textNode(text: string, run: Run): InlineNode {
  const marks: { type: 'bold' | 'italic' }[] = [];
  if (run.bold) marks.push({ type: 'bold' });
  if (run.italic) marks.push({ type: 'italic' });
  return marks.length ? { type: 'text', text, marks } : { type: 'text', text };
}

type LegacyBlock = { id?: string; content?: unknown; type?: string };
type LegacyNote = { id?: string; key?: string; content?: unknown; category?: string; source?: string };
type LegacyReview = {
  id?: string;
  type?: string;
  original?: string;
  suggestion?: string;
  explanation?: string;
  source?: string;
  status?: string;
};

function legacyNoteNumber(note: LegacyNote, index: number): number {
  const digits = String(note.key ?? '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : index + 1;
}

export function isLegacyChapter(data: Record<string, unknown>): boolean {
  return data.schema !== CURRENT_SCHEMA && !(data.doc && typeof data.doc === 'object');
}

function mapStatus(s: unknown): SuggestionStatus {
  return s === 'accepted' || s === 'rejected' ? s : 'pending';
}

/**
 * Convertit un document chapitre Firestore (v1 ou v2) en Chapter v2.
 * Pure et déterministe : utilisable côté client comme dans les tests.
 */
export function chapterFromFirestore(id: string, data: Record<string, unknown>, fallbackOrder = 0): Chapter {
  const now = Date.now();
  const updatedAt = toMillis(data.updatedAt) || now;
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 300) : 'Chapitre sans titre';
  const order = typeof data.order === 'number' ? data.order : fallbackOrder;
  const status: ChapterStatus = data.status === 'revision' || data.status === 'final' ? data.status : 'draft';

  if (!isLegacyChapter(data)) {
    const doc = normalizeDoc(data.doc);
    return {
      id,
      title,
      order,
      status,
      doc,
      notes: sanitizeNotes(data.notes),
      suggestions: sanitizeSuggestions(data.suggestions),
      wordCount: typeof data.wordCount === 'number' ? data.wordCount : docWordCount(doc),
      updatedAt,
      updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
    };
  }

  // ── v1 → v2 ──
  const legacyNotes = Array.isArray(data.notes) ? (data.notes as LegacyNote[]) : [];
  const notes: Note[] = [];
  const footnoteByNumber = new Map<number, string>();
  let footIndex = 0;
  legacyNotes.forEach((n, i) => {
    const text = typeof n === 'string' ? n : typeof n?.content === 'string' ? n.content : '';
    if (!text.trim()) return;
    const noteId = typeof n?.id === 'string' && n.id ? n.id.slice(0, 64) : `n-legacy-${i}`;
    const isMemo = typeof n === 'object' && n?.category === 'margin';
    notes.push({
      id: noteId,
      kind: isMemo ? 'memo' : 'footnote',
      text: decodeEntities(text).slice(0, 20_000),
      source: n?.source === 'ai' ? 'ai' : 'manual',
      createdAt: updatedAt,
    });
    if (!isMemo) footnoteByNumber.set(legacyNoteNumber(n, footIndex++), noteId);
  });

  const legacyBlocks: LegacyBlock[] =
    Array.isArray(data.blocks) && data.blocks.length
      ? (data.blocks as LegacyBlock[])
      : Array.isArray(data.paragraphs)
        ? (data.paragraphs as unknown[]).map((p) => ({ content: typeof p === 'string' ? p : '' }))
        : [];

  const used = new Set<string>();
  const resolveNote = (num: number) => {
    const noteId = footnoteByNumber.get(num);
    if (noteId) used.add(noteId);
    return noteId ?? null;
  };

  const blocks: BlockNode[] = [];
  for (const b of legacyBlocks) {
    const html = typeof b?.content === 'string' ? b.content : '';
    const inline = runsToInline(htmlToRuns(html), resolveNote);
    const hasText = inline.some((n) => n.type !== 'hardBreak');
    if (!hasText) continue;
    if (b.type === 'heading') blocks.push({ type: 'heading', attrs: { level: 2 }, content: inline });
    else if (b.type === 'quote') blocks.push({ type: 'blockquote', content: [{ type: 'paragraph', content: inline }] });
    else blocks.push({ type: 'paragraph', content: inline });
  }

  const doc: DocNode = normalizeDoc({ type: 'doc', content: blocks });
  // Notes de bas de page jamais appelées dans le texte : conservées en pense-bête.
  for (const note of notes) {
    if (note.kind === 'footnote' && !used.has(note.id)) note.kind = 'memo';
  }

  const reviews = Array.isArray(data.pendingReviews) ? (data.pendingReviews as LegacyReview[]) : [];
  const suggestions: Suggestion[] = reviews
    .filter((r) => r && typeof r.original === 'string')
    .map((r, i) => ({
      id: typeof r.id === 'string' ? r.id.slice(0, 64) : `s-legacy-${i}`,
      kind: r.type === 'correction' ? 'fact' : 'style',
      original: r.original!.slice(0, 5000),
      replacement: typeof r.suggestion === 'string' ? r.suggestion.slice(0, 5000) : '',
      explanation: typeof r.explanation === 'string' ? r.explanation.slice(0, 2000) : undefined,
      status: mapStatus(r.status),
      createdAt: updatedAt,
    }));

  return {
    id,
    title,
    order,
    status,
    doc,
    notes,
    suggestions,
    wordCount: docWordCount(doc),
    updatedAt,
  };
}

export function sanitizeNotes(input: unknown): Note[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((n): n is Record<string, unknown> => typeof n === 'object' && n !== null)
    .map((n, i) => ({
      id: typeof n.id === 'string' ? n.id.slice(0, 64) : `n-${i}`,
      kind: n.kind === 'memo' ? ('memo' as const) : ('footnote' as const),
      text: typeof n.text === 'string' ? n.text.slice(0, 20_000) : '',
      source: n.source === 'ai' || n.source === 'research' ? n.source : ('manual' as const),
      createdAt: typeof n.createdAt === 'number' ? n.createdAt : 0,
      ...(Array.isArray(n.links)
        ? {
            links: (n.links as unknown[])
              .filter((l): l is { title: string; uri: string } => {
                const o = l as Record<string, unknown>;
                return typeof o?.uri === 'string' && /^https?:\/\//.test(o.uri);
              })
              .slice(0, 12)
              .map((l) => ({ title: String(l.title ?? l.uri).slice(0, 300), uri: l.uri.slice(0, 2000) })),
          }
        : {}),
    }));
}

export function sanitizeSuggestions(input: unknown): Suggestion[] {
  if (!Array.isArray(input)) return [];
  const verdicts = new Set(['confirmed', 'caution', 'error', 'unverified']);
  return input
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null && typeof s.original === 'string')
    .map((s, i) => ({
      id: typeof s.id === 'string' ? s.id.slice(0, 64) : `s-${i}`,
      kind: s.kind === 'fact' || s.kind === 'dictation' ? s.kind : ('style' as const),
      original: String(s.original).slice(0, 5000),
      replacement: typeof s.replacement === 'string' ? s.replacement.slice(0, 5000) : '',
      explanation: typeof s.explanation === 'string' ? s.explanation.slice(0, 2000) : undefined,
      verdict: typeof s.verdict === 'string' && verdicts.has(s.verdict) ? (s.verdict as Suggestion['verdict']) : undefined,
      sources: Array.isArray(s.sources)
        ? (s.sources as Record<string, unknown>[])
            .filter((l) => typeof l?.uri === 'string' && /^https?:\/\//.test(l.uri as string))
            .slice(0, 8)
            .map((l) => ({ title: String(l.title ?? l.uri).slice(0, 300), uri: String(l.uri).slice(0, 2000) }))
        : undefined,
      status: mapStatus(s.status),
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : 0,
    }));
}

export function toMillis(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'object') {
    const v = val as { toMillis?: () => number; seconds?: number };
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
  }
  if (typeof val === 'string') {
    const t = new Date(val).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}
