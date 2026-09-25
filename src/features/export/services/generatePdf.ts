import React from 'react';
import { pdf } from '@react-pdf/renderer';
import type { Chapter } from '@/lib/doc/types';
import { docToRenderBlocks, orderedFootnotes } from '@/lib/doc/text';
import type { BookMetadata, CoverConfig, FrontBackMatterSection } from '../types/bookMeta';
import type { ExportSettings } from '../types/exportSettings';
import { resolveTheme } from '../themes/registry';
import { BookDocument, type PdfChapter } from '../pdf/BookDocument';
import { registerPdfFonts } from '../pdf/fonts';
import { enrichPdfMetadata } from './pdfMetadata';

export function toPdfChapters(chapters: Chapter[]): PdfChapter[] {
  return chapters.map((c) => ({
    id: c.id,
    title: c.title,
    blocks: docToRenderBlocks(c.doc),
    footnotes: orderedFootnotes(c.doc, c.notes).map(({ number, note }) => ({ number, text: note.text })),
  }));
}

export async function generatePdf(
  chapters: Chapter[],
  metadata: BookMetadata,
  coverConfig: CoverConfig,
  settings: ExportSettings,
  sections: FrontBackMatterSection[] = [],
): Promise<Blob> {
  registerPdfFonts(window.location.origin);
  const element = React.createElement(BookDocument, {
    chapters: toPdfChapters(chapters),
    metadata,
    coverConfig,
    settings,
    theme: resolveTheme(settings.themeId, settings.customTheme),
    frontBackSections: sections,
  });
  const blob = await pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob();
  const bytes = await enrichPdfMetadata(await blob.arrayBuffer(), metadata);
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
