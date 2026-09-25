import { PDFDocument } from 'pdf-lib';
import type { BookMetadata } from '../types/bookMeta';

export async function enrichPdfMetadata(pdfBuffer: ArrayBuffer, metadata: BookMetadata): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer);
  doc.setTitle(metadata.title);
  doc.setAuthor(metadata.penName || metadata.authorName);
  doc.setProducer('Atelier');
  doc.setCreator('Atelier — L’Atelier de l’Écrivain');
  doc.setLanguage('fr-FR');
  if (metadata.subtitle) doc.setSubject(metadata.subtitle);
  return doc.save();
}
