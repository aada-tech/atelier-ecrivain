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

/**
 * Les polices standard PDF (Helvetica, Courier) se limitent à WinAnsi :
 * on remplace les caractères hors jeu par des équivalents sûrs.
 */
export function textFor(token: FontToken, text: string): string {
  if (token.startsWith('serif')) return text.replace(/ /g, ' ');
  return text
    .replace(/[   ]/g, ' ')
    .replace(/⁂/g, '* * *')
    .replace(/[^\u0000-ÿŒœŠšŸŽžƒˆ˜–—‘’‚“”„†‡•…‰‹›€™]/g, '');
}
