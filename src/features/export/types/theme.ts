export type FontToken = 'serif' | 'serif-bold' | 'sans' | 'sans-bold' | 'mono' | 'mono-bold';

import { ThemeId } from './exportSettings';

export interface ExportTheme {
  id: ThemeId;
  label: string;
  fonts: { heading: FontToken; body: FontToken; folio: FontToken };
  colors: { text: string; accent: string; ruleLine: string };
  chapterOpening: 'drop-cap' | 'centered-number' | 'ornament' | 'plain';
  headerStyle: 'author-title-alternating' | 'title-only' | 'none';
  folioStyle: 'centered' | 'outer-corner' | 'none';
  ornamentGlyph?: string;
  titlePageLayout: 'centered' | 'left-aligned' | 'framed';
}
