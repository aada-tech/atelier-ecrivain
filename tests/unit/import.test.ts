import { describe, expect, it } from 'vitest';
import { importText, parseInline } from '@/lib/import';
import { docToPlainText } from '@/lib/doc/text';

describe('parseInline', () => {
  it('reconnaît gras et italique', () => {
    expect(parseInline('un *mot* et **fort**')).toEqual([
      { type: 'text', text: 'un ' },
      { type: 'text', text: 'mot', marks: [{ type: 'italic' }] },
      { type: 'text', text: ' et ' },
      { type: 'text', text: 'fort', marks: [{ type: 'bold' }] },
    ]);
  });
});

describe('importText', () => {
  it('découpe sur les titres Markdown', () => {
    const chapters = importText('# Un\n\nPremier.\n\n# Deux\n\nSecond paragraphe.\n\n* * *\n\nSuite.');
    expect(chapters.map((c) => c.title)).toEqual(['Un', 'Deux']);
    expect(docToPlainText(chapters[1].doc)).toBe('Second paragraphe.\n\n* * *\n\nSuite.');
  });
  it('découpe sur « Chapitre N »', () => {
    const chapters = importText('Chapitre 1\nIl était une fois.\n\nChapitre 2\nLa suite.');
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe('Chapitre 1');
  });
  it('garde un seul chapitre sans titre', () => {
    const chapters = importText('Juste un texte.\nSur deux lignes.', 'Import');
    expect(chapters).toHaveLength(1);
    expect(docToPlainText(chapters[0].doc)).toBe('Juste un texte. Sur deux lignes.');
  });
});
