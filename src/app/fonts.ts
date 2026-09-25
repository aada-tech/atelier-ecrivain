import { Geist, Geist_Mono, Instrument_Serif, Literata } from 'next/font/google';

/**
 * Polices auto-hébergées par next/font : téléchargées au build et servies
 * depuis notre domaine. Aucune requête vers Google Fonts côté visiteur (RGPD).
 */
export const fontSans = Geist({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist',
  display: 'swap',
});

export const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const fontDisplay = Instrument_Serif({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

export const fontSerif = Literata({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  variable: '--font-literata',
  display: 'swap',
});

export const fontVariables = [fontSans.variable, fontMono.variable, fontDisplay.variable, fontSerif.variable].join(' ');
