import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { buildEpub, escapeXml } from '@/lib/export/epub';
import type { Chapter } from '@/lib/doc/types';

const chapter = (id: string, title: string, text: string): Chapter => ({
  id,
  title,
  order: 0,
  status: 'draft',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text },
          { type: 'noteRef', attrs: { id: `${id}-n` } },
        ],
      },
    ],
  },
  notes: [{ id: `${id}-n`, kind: 'footnote', text: `Note <${id}>`, source: 'manual', createdAt: 0 }],
  suggestions: [],
  wordCount: 3,
  updatedAt: 0,
});

describe('buildEpub', () => {
  const bytes = buildEpub([chapter('a', 'Premier <script>', 'Texte & suite'), chapter('b', 'Second', 'Fin')], {
    title: 'Mon "livre"',
    author: 'A. Auteur',
    identifier: 'urn:uuid:test',
    coverDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
  });
  const files = unzipSync(bytes);

  it('place un fichier mimetype non compressé en premier', () => {
    // En-tête local ZIP : nom du premier fichier à l'octet 30, méthode de compression à l'octet 8.
    expect(strFromU8(bytes.slice(30, 38))).toBe('mimetype');
    expect(bytes[8] | (bytes[9] << 8)).toBe(0);
    expect(strFromU8(files.mimetype)).toBe('application/epub+zip');
  });

  it('contient le paquet OPF, le sommaire, la couverture et un fichier par chapitre', () => {
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        'META-INF/container.xml',
        'OEBPS/content.opf',
        'OEBPS/nav.xhtml',
        'OEBPS/cover.png',
        'OEBPS/chap1.xhtml',
        'OEBPS/chap2.xhtml',
      ]),
    );
    const opf = strFromU8(files['OEBPS/content.opf']);
    expect(opf).toContain('<dc:title>Mon &quot;livre&quot;</dc:title>');
    expect(opf).toContain('properties="cover-image"');
  });

  it('échappe tout le contenu utilisateur', () => {
    const chap = strFromU8(files['OEBPS/chap1.xhtml']);
    expect(chap).not.toContain('<script>');
    expect(chap).toContain('Premier &lt;script&gt;');
    expect(chap).toContain('Texte &amp; suite');
    expect(chap).toContain('Note &lt;a&gt;');
    expect(chap).toContain('epub:type="noteref"');
    expect(strFromU8(files['OEBPS/nav.xhtml'])).toContain('Premier &lt;script&gt;');
  });

  it('retire les caractères de contrôle interdits en XML', () => {
    expect(escapeXml('a\u0001b\u000bc\n')).toBe('abc\n');
  });
});
