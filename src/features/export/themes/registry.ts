import { ExportTheme } from '../types/theme';
import { ThemeId, CustomThemeOverrides } from '../types/exportSettings';

export const THEME_REGISTRY: Record<ThemeId, ExportTheme> = {
  classique: {
    id: 'classique',
    label: 'Roman Classique',
    fonts: { heading: 'serif', body: 'serif', folio: 'serif' },
    colors: { text: '#1a1a1a', accent: '#8a5a34', ruleLine: '#d1c7bd' },
    chapterOpening: 'drop-cap',
    headerStyle: 'author-title-alternating',
    folioStyle: 'outer-corner',
    ornamentGlyph: '❦',
    titlePageLayout: 'centered',
  },
  fantasy: {
    id: 'fantasy',
    label: 'Fantasy & Imaginaire',
    fonts: { heading: 'serif-bold', body: 'serif', folio: 'serif' },
    colors: { text: '#111827', accent: '#4c1d95', ruleLine: '#8b5cf6' },
    chapterOpening: 'ornament',
    headerStyle: 'author-title-alternating',
    folioStyle: 'centered',
    ornamentGlyph: '✦',
    titlePageLayout: 'framed',
  },
  sf: {
    id: 'sf',
    label: 'Science-Fiction',
    fonts: { heading: 'sans-bold', body: 'sans', folio: 'sans' },
    colors: { text: '#0f172a', accent: '#0284c7', ruleLine: '#38bdf8' },
    chapterOpening: 'centered-number',
    headerStyle: 'title-only',
    folioStyle: 'outer-corner',
    ornamentGlyph: '❖',
    titlePageLayout: 'left-aligned',
  },
  polar: {
    id: 'polar',
    label: 'Polar / Noir',
    fonts: { heading: 'mono-bold', body: 'serif', folio: 'mono' },
    colors: { text: '#18181b', accent: '#dc2626', ruleLine: '#ef4444' },
    chapterOpening: 'plain',
    headerStyle: 'title-only',
    folioStyle: 'outer-corner',
    titlePageLayout: 'left-aligned',
  },
  thriller: {
    id: 'thriller',
    label: 'Thriller Psychologique',
    fonts: { heading: 'sans-bold', body: 'sans', folio: 'sans' },
    colors: { text: '#09090b', accent: '#b91c1c', ruleLine: '#71717a' },
    chapterOpening: 'centered-number',
    headerStyle: 'author-title-alternating',
    folioStyle: 'centered',
    titlePageLayout: 'centered',
  },
  essai: {
    id: 'essai',
    label: 'Essai / Réflexion',
    fonts: { heading: 'serif-bold', body: 'serif', folio: 'serif' },
    colors: { text: '#1c1917', accent: '#9a3412', ruleLine: '#c2410c' },
    chapterOpening: 'plain',
    headerStyle: 'author-title-alternating',
    folioStyle: 'outer-corner',
    titlePageLayout: 'centered',
  },
  biographie: {
    id: 'biographie',
    label: 'Mémoires / Biographie',
    fonts: { heading: 'serif-bold', body: 'serif', folio: 'serif' },
    colors: { text: '#27272a', accent: '#047857', ruleLine: '#10b981' },
    chapterOpening: 'drop-cap',
    headerStyle: 'author-title-alternating',
    folioStyle: 'outer-corner',
    ornamentGlyph: '❧',
    titlePageLayout: 'centered',
  },
  jeunesse: {
    id: 'jeunesse',
    label: 'Jeunesse / Aventure',
    fonts: { heading: 'sans-bold', body: 'sans', folio: 'sans' },
    colors: { text: '#1e293b', accent: '#ea580c', ruleLine: '#f97316' },
    chapterOpening: 'ornament',
    headerStyle: 'title-only',
    folioStyle: 'centered',
    ornamentGlyph: '★',
    titlePageLayout: 'centered',
  },
  minimaliste: {
    id: 'minimaliste',
    label: 'Minimaliste Épuré',
    fonts: { heading: 'sans', body: 'sans', folio: 'sans' },
    colors: { text: '#262626', accent: '#525252', ruleLine: '#a3a3a3' },
    chapterOpening: 'plain',
    headerStyle: 'none',
    folioStyle: 'centered',
    titlePageLayout: 'left-aligned',
  },
  prestige: {
    id: 'prestige',
    label: 'Édition Prestige',
    fonts: { heading: 'serif-bold', body: 'serif', folio: 'serif' },
    colors: { text: '#1a100c', accent: '#b45309', ruleLine: '#f59e0b' },
    chapterOpening: 'drop-cap',
    headerStyle: 'author-title-alternating',
    folioStyle: 'outer-corner',
    ornamentGlyph: '❦',
    titlePageLayout: 'framed',
  },
};

export function getTheme(id: ThemeId): ExportTheme {
  return THEME_REGISTRY[id] || THEME_REGISTRY.classique;
}

export function resolveTheme(id: ThemeId, customTheme?: CustomThemeOverrides): ExportTheme {
  const base = getTheme(id);
  if (!customTheme) return base;

  return {
    ...base,
    colors: {
      text: customTheme.textColor || base.colors.text,
      accent: customTheme.accentColor || base.colors.accent,
      ruleLine: customTheme.ruleColor || customTheme.accentColor || base.colors.ruleLine,
    },
    titlePageLayout: customTheme.chapterTitleAlignment || base.titlePageLayout,
    ornamentGlyph: customTheme.showOrnament !== false ? base.ornamentGlyph : undefined,
  };
}
