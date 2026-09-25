import { describe, expect, it } from 'vitest';
import {
  chapterToMarkdown,
  countWords,
  docToPlainText,
  docToRenderBlocks,
  isDocEmpty,
  normalizeDoc,
  noteNumbering,
  orderedFootnotes,
  textToDoc,
} from '@/lib/doc/text';
import type { DocNode, Note } from '@/lib/doc/types';

const doc: DocNode = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Partie *une*' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Il vit ' },
        { type: 'text', text: 'la mer', marks: [{ type: 'italic' }] },
        { type: 'noteRef', attrs: { id: 'b' } },
        { type: 'text', text: ' puis le phare' },
        { type: 'noteRef', attrs: { id: 'a' } },
        { type: 'text', text: '.' },
      ],
    },
    { type: 'horizontalRule' },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Citation' }] }] },
  ],
};

const notes: Note[] = [
  { id: 'a', kind: 'footnote', text: 'Deuxième appel', source: 'manual', createdAt: 0 },
  { id: 'b', kind: 'footnote', text: 'Premier appel', source: 'manual', createdAt: 0 },
  { id: 'm', kind: 'memo', text: 'Pense-bête', source: 'manual', createdAt: 0 },
];

describe('normalizeDoc', () => {
  it('rejette les entrées non conformes', () => {
    expect(normalizeDoc(null)).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(normalizeDoc({ content: 'x' })).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('ne garde que le schéma restreint (marques, niveaux, nœuds)', () => {
    const out = normalizeDoc({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'T' }] },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'a', marks: [{ type: 'link', attrs: { href: 'javascript:x' } }, { type: 'bold' }] }],
        },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }] }],
        },
        { type: 'image', attrs: { src: 'x' } },
        {
          type: 'paragraph',
          content: [{ type: 'noteRef', attrs: { id: 'x'.repeat(200) } }, { type: 'mention' }, { type: 'text', text: '' }],
        },
      ],
    });
    expect(out.content[0]).toEqual({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'T' }] });
    expect(out.content[1]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'bold' }] }] });
    expect(docToPlainText({ ...out, content: [out.content[2]] }).trim()).toBe('item');
    expect(out.content).toHaveLength(4);
    const last = out.content[3];
    expect(last.type === 'paragraph' && last.content?.[0]).toEqual({ type: 'noteRef', attrs: { id: 'x'.repeat(64) } });
  });
});

describe('texte et comptage', () => {
  it('compte les mots à la française', () => {
    expect(countWords('L’homme, « vite » — et 12 chats !')).toBe(5);
    expect(countWords('   ')).toBe(0);
  });
  it('textToDoc découpe en paragraphes et conserve les retours simples', () => {
    const d = textToDoc('Un\r\ndeux\n\n\nTrois');
    expect(d.content).toHaveLength(2);
    expect(d.content[0]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Un' }, { type: 'hardBreak' }, { type: 'text', text: 'deux' }],
    });
    expect(isDocEmpty(textToDoc(''))).toBe(true);
  });
});

describe('notes et rendu', () => {
  it('numérote les appels dans leur ordre d’apparition', () => {
    expect([...noteNumbering(doc)]).toEqual([
      ['b', 1],
      ['a', 2],
    ]);
    expect(orderedFootnotes(doc, notes).map((f) => f.note.text)).toEqual(['Premier appel', 'Deuxième appel']);
  });

  it('produit des blocs neutres pour la liseuse et les exports', () => {
    const blocks = docToRenderBlocks(doc);
    expect(blocks.map((b) => b.type)).toEqual(['h2', 'p', 'scene-break', 'quote']);
  });

  it('exporte en Markdown avec notes et échappement', () => {
    const md = chapterToMarkdown('Titre #1', doc, notes);
    expect(md.startsWith('# Titre \\#1\n')).toBe(true);
    expect(md).toContain('## Partie \\*une\\*');
    expect(md).toContain('Il vit *la mer*[^1] puis le phare[^2].');
    expect(md).toContain('* * *');
    expect(md).toContain('> Citation');
    expect(md).toContain('[^1]: Premier appel');
    expect(md).not.toContain('Pense-bête');
  });
});
