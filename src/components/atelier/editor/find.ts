import type { Node as PMNode } from '@tiptap/pm/model';

export interface TextRange {
  from: number;
  to: number;
}

/** Normalisation 1 caractère → 1 caractère (préserve les index). */
function normChar(c: string, caseInsensitive: boolean): string {
  let out = c;
  if (out === '’' || out === '‘' || out === 'ʼ') out = "'";
  else if (out === ' ' || out === ' ' || out === '\t') out = ' ';
  else if (out === '“' || out === '”') out = '"';
  return caseInsensitive ? out.toLowerCase() : out;
}

export function normalizeForSearch(s: string, caseInsensitive = false): string {
  let r = '';
  for (const c of s) r += normChar(c, caseInsensitive);
  return r;
}

/**
 * Trouve les occurrences d'un texte dans le document ProseMirror, bloc par
 * bloc. Les appels de note (atomes) sont ignorés pour correspondre au texte
 * brut envoyé à l'IA.
 */
export function findTextRanges(
  doc: PMNode,
  needle: string,
  opts: { caseInsensitive?: boolean; limit?: number } = {},
): TextRange[] {
  const ci = Boolean(opts.caseInsensitive);
  const target = normalizeForSearch(needle, ci);
  if (!target.trim()) return [];
  const limit = opts.limit ?? 200;
  const results: TextRange[] = [];

  doc.descendants((node, pos) => {
    if (results.length >= limit) return false;
    if (!node.isTextblock) return true;
    let text = '';
    const map: number[] = [];
    node.forEach((child, offset) => {
      const start = pos + 1 + offset;
      if (child.isText && child.text) {
        const t = child.text;
        // Itération par unités UTF-16 pour garder la correspondance des positions ProseMirror.
        for (let i = 0; i < t.length; i++) {
          text += normChar(t[i], ci);
          map.push(start + i);
        }
      } else if (child.type.name === 'hardBreak') {
        text += '\n';
        map.push(start);
      }
    });
    let idx = text.indexOf(target);
    while (idx !== -1 && results.length < limit) {
      results.push({ from: map[idx], to: map[idx + target.length - 1] + 1 });
      idx = text.indexOf(target, idx + Math.max(1, target.length));
    }
    return false;
  });
  return results;
}
