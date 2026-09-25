import { Font } from '@react-pdf/renderer';
import type { FontToken } from '../types/theme';

let registered = false;

/** Enregistre Literata (OFL), embarquée dans le PDF : typographie française complète. */
export function registerPdfFonts(origin: string) {
  if (registered) return;
  Font.register({
    family: 'Literata',
    fonts: [
      { src: `${origin}/fonts/pdf/Literata-Regular.woff` },
      { src: `${origin}/fonts/pdf/Literata-Italic.woff`, fontStyle: 'italic' },
      { src: `${origin}/fonts/pdf/Literata-Bold.woff`, fontWeight: 700 },
      { src: `${origin}/fonts/pdf/Literata-BoldItalic.woff`, fontWeight: 700, fontStyle: 'italic' },
    ],
  });
  // Pas de césure automatique à l'anglaise : on garde les mots entiers.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

export type FontStyle = {
  fontFamily: string;
  fontWeight?: number;
  fontStyle?: 'italic' | 'normal';
};

/** Résout un jeton de thème + graisse/italique vers une police PDF. */
export function face(token: FontToken, opts: { bold?: boolean; italic?: boolean } = {}): FontStyle {
  const bold = opts.bold || token.endsWith('-bold');
  const italic = Boolean(opts.italic);
  if (token.startsWith('serif')) {
    return { fontFamily: 'Literata', fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal' };
  }
  const base = token.startsWith('mono') ? 'Courier' : 'Helvetica';
  const suffix = bold && italic ? '-BoldOblique' : bold ? '-Bold' : italic ? '-Oblique' : '';
  return { fontFamily: `${base}${suffix}` };
}

/** Symboles courants absents des polices embarquées → équivalents lisibles. */
const SYMBOLS: Record<string, string> = {
  '⌘': 'Cmd',
  '⌥': 'Alt',
  '⇧': 'Maj',
  '⌃': 'Ctrl',
  '⏎': 'Entrée',
  '→': '->',
  '←': '<-',
  '⁂': '* * *',
  '\u202f': '\u00a0',
};
const SYMBOL_RE = /[⌘⌥⇧⌃⏎→←⁂\u202f]/g;

/** Tout ce que ne couvre pas le sous-ensemble latin de Literata embarqué (les 4 graisses). */
const OUTSIDE_LITERATA =
  /[^\n\t\u0020-\u007e\u00a0-\u00ff\u0102\u0131\u0152\u0153\u02bb\u02bc\u02c6\u02da\u02dc\u0300\u0301\u0303\u0304\u0308\u0309\u0323\u2009\u200b\u2013\u2014\u2018-\u201a\u201c-\u201e\u2022\u2026\u2032\u2033\u2039\u203a\u2044\u20ac\u2122\u2191\u2193\u2212\u2215]/gu;

/**
 * Adapte le texte aux glyphes réellement disponibles : un caractère absent de
 * la police s'afficherait comme un autre glyphe (ou un carré). Les symboles
 * courants sont traduits, le reste (emoji…) est retiré. Les polices standard
 * PDF (Helvetica, Courier) se limitent en plus à WinAnsi.
 */
export function textFor(token: FontToken, raw: string): string {
  const text = raw.replace(SYMBOL_RE, (c) => SYMBOLS[c] ?? '');
  if (token.startsWith('serif')) return text.replace(OUTSIDE_LITERATA, '');
  return text.replace(/[   ]/g, ' ').replace(/[^\u0000-ÿŒœŠšŸŽžƒˆ˜–—‘’‚“”„†‡•…‰‹›€™]/g, '');
}
