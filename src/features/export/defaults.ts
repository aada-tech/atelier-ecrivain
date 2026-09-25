import type { BookMetadata, CoverConfig } from './types/bookMeta';
import type { ExportSettings, PageSetup } from './types/exportSettings';

export const DEFAULT_PAGE_SETUP: PageSetup = {
  format: 'A5',
  orientation: 'portrait',
  marginTopMm: 18,
  marginBottomMm: 20,
  marginInsideMm: 20,
  marginOutsideMm: 16,
  bleedMm: 0,
  fontSizePt: 10.5,
  lineHeight: 1.45,
  firstLineIndentMm: 5,
  justify: true,
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  id: 'default',
  themeId: 'classique',
  page: DEFAULT_PAGE_SETUP,
  includeToc: true,
  includeChapterNumbers: true,
  startNewPagePerChapter: true,
  updatedAt: 0,
};

export const DEFAULT_COVER: CoverConfig = {
  mode: 'generated',
  background: { type: 'gradient', value: 'linear-gradient(160deg, #1d1b2b 0%, #3b2a4a 55%, #f2542d 140%)' },
  titleColor: '#ffffff',
};

export function defaultMetadata(title: string, author: string): BookMetadata {
  return { title, authorName: author };
}

export const COVER_PALETTES: { name: string; value: string; text: string }[] = [
  { name: 'Crépuscule', value: 'linear-gradient(160deg, #1d1b2b 0%, #3b2a4a 55%, #f2542d 140%)', text: '#ffffff' },
  { name: 'Encre', value: 'linear-gradient(180deg, #0f1220 0%, #1f2a44 100%)', text: '#f4efe6' },
  { name: 'Braise', value: 'linear-gradient(150deg, #ff9466 0%, #f2542d 45%, #b3263e 100%)', text: '#ffffff' },
  { name: 'Iris', value: 'linear-gradient(160deg, #1b1446 0%, #6a5cf5 100%)', text: '#ffffff' },
  { name: 'Forêt', value: 'linear-gradient(170deg, #0f2a22 0%, #1b8a5e 120%)', text: '#f1f6ef' },
  { name: 'Papier', value: '#f1e6d2', text: '#2b2118' },
  { name: 'Craie', value: '#fbfaf7', text: '#17151f' },
  { name: 'Nuit', value: '#0b0b10', text: '#e8b04b' },
];
