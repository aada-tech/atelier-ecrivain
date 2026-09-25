/**
 * Mise en forme du texte dicté : commandes vocales de ponctuation,
 * typographie française, capitalisation et raccord avec le texte existant.
 * Fonctions pures, testées unitairement.
 */

const NBSP = '\u00a0';
const L = '\\p{L}';
const before = `(?<![${L}])`;
const after = `(?![${L}])`;

function cmd(words: string): RegExp {
  return new RegExp(`\\s*${before}(?:${words})${after}`, 'giu');
}

/** Commandes non ambiguës : converties où qu'elles soient. */
const ALWAYS: [RegExp, string][] = [
  [cmd('point à la ligne|point,? à la ligne'), '.\n\n'],
  [cmd('nouveau paragraphe|à la ligne|retour à la ligne'), '\n\n'],
  [cmd('points de suspension'), '…'],
  [cmd("point d['’]interrogation"), `${NBSP}?`],
  [cmd("point d['’]exclamation"), `${NBSP}!`],
  [cmd('point[- ]virgule'), `${NBSP};`],
  [cmd('deux[- ]points(?=\\s+ouv)'), `${NBSP}:`],
  [cmd('ouvre[zr]? les guillemets|ouvrir les guillemets'), ` «${NBSP}`],
  [cmd('ferme[zr]? les guillemets|fermer les guillemets'), `${NBSP}»`],
  [cmd('ouvre[zr]? la parenthèse'), ' ('],
  [cmd('ferme[zr]? la parenthèse'), ')'],
  [cmd('virgule'), ','],
];

/** Commandes ambiguës (« le point de vue », « deux points communs ») : seulement en fin de segment. */
const AT_END: [RegExp, string][] = [
  [new RegExp(`\\s*${before}deux[- ]points\\s*$`, 'iu'), `${NBSP}:`],
  [new RegExp(`\\s*${before}point(?: final)?\\s*$`, 'iu'), '.'],
];

export function applyVoiceCommands(segment: string, isFinal = true): string {
  let s = segment;
  for (const [re, rep] of ALWAYS) s = s.replace(re, rep);
  if (isFinal) for (const [re, rep] of AT_END) s = s.replace(re, rep);
  return tidy(s);
}

/** Espacements typographiques et capitales après une fin de phrase. */
export function tidy(input: string): string {
  let s = input
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +([,.)…])/g, '$1')
    .replace(/([,.;:!?…])(?=[\p{L}«(])/gu, '$1 ')
    .replace(/\( +/g, '(')
    .replace(/ ?\u00a0 ?/g, NBSP)
    .replace(/«\u00a0\s+/g, `«${NBSP}`);
  // Capitale en début de phrase.
  s = s.replace(
    /([.!?…]\s+|\n\n|^\s*|«\u00a0)(«\u00a0)?(\p{Ll})/gu,
    (_m, sep: string, quote: string | undefined, ch: string) => `${sep}${quote ?? ''}${ch.toUpperCase()}`,
  );
  return s.trim();
}

/**
 * Raccorde un texte dicté à ce qui précède le curseur dans le paragraphe :
 * espace si nécessaire, capitale en début de phrase.
 */
export function joinDictation(beforeText: string, text: string): string {
  let t = text.trim();
  if (!t) return '';
  const prev = beforeText.replace(/\u00a0/g, ' ');
  const startsSentence = prev.trim() === '' || /[.!?…»]\s*$/.test(prev.trimEnd());
  if (startsSentence) t = t.replace(/^(«\u00a0)?(\p{Ll})/u, (_m, q: string | undefined, c: string) => `${q ?? ''}${c.toUpperCase()}`);
  else if (/^\p{Lu}\p{Ll}/u.test(t) && !/[.!?…]\s*$/.test(prev) && prev.trim() !== '') {
    // Le moteur a mis une majuscule en milieu de phrase : on la retire (sauf nom propre probable).
    const firstWord = t.split(/\s/)[0];
    if (firstWord.length > 1 && COMMON_STARTS.has(firstWord.toLowerCase())) t = t[0].toLowerCase() + t.slice(1);
  }
  const needsSpace = prev.length > 0 && !/\s$/.test(prev) && !/^[,.;:!?…)»\]]/.test(t) && !/^\u00a0/.test(t);
  return (needsSpace ? ' ' : '') + t;
}

const COMMON_STARTS = new Set([
  'et',
  'mais',
  'ou',
  'donc',
  'car',
  'puis',
  'alors',
  'le',
  'la',
  'les',
  'un',
  'une',
  'des',
  'il',
  'elle',
  'ils',
  'elles',
  'je',
  'tu',
  'nous',
  'vous',
  'on',
  'ce',
  'cette',
  'qui',
  'que',
  'quand',
  'comme',
  'dans',
  'sur',
  'avec',
]);

/**
 * Fusionne un nouveau segment reconnu avec le texte déjà acquis, en gérant
 * les résultats cumulatifs de Chrome Android (« je », « je suis », « je suis là »).
 */
export function mergeSegment(base: string, addition: string): string {
  const b = base.trim();
  const a = addition.trim();
  if (!b) return a;
  if (!a) return b;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const nb = norm(b);
  const na = norm(a);
  if (na === nb || nb.endsWith(na)) return b;
  if (na.startsWith(nb)) return a;
  const bw = b.split(/\s+/);
  const aw = a.split(/\s+/);
  const nbw = nb.split(' ');
  const naw = na.split(' ');
  for (let k = Math.min(nbw.length, naw.length); k >= 2; k--) {
    if (nbw.slice(-k).join(' ') === naw.slice(0, k).join(' ')) return [...bw, ...aw.slice(k)].join(' ');
  }
  return `${b} ${a}`;
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
