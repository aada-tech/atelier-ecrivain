import { describe, expect, it } from 'vitest';
import {
  chapterFromFirestore,
  decodeEntities,
  htmlToRuns,
  isLegacyChapter,
  sanitizeNotes,
  sanitizeSuggestions,
  toMillis,
} from '@/lib/doc/legacy';
import { docToPlainText } from '@/lib/doc/text';

describe('decodeEntities', () => {
  it('décode entités nommées et numériques', () => {
    expect(decodeEntities('&laquo;&nbsp;Oui&nbsp;&raquo; &amp; &#233;t&#xE9;')).toBe('«\u00a0Oui\u00a0» & été');
  });
  it('laisse les entités inconnues et ignore les codes invalides', () => {
    expect(decodeEntities('&inconnue; &#0;')).toBe('&inconnue; ');
  });
});

describe('htmlToRuns', () => {
  it('conserve gras/italique et ignore scripts, styles et commentaires', () => {
    const runs = htmlToRuns('<b>Fort</b> et <em>doux</em><script>alert(1)</script><style>p{}</style><!-- x --> fin');
    expect(runs.map((r) => r.text).join('')).toBe('Fort et doux fin');
    expect(runs[0]).toMatchObject({ text: 'Fort', bold: true, italic: false });
    expect(runs.find((r) => r.text === 'doux')).toMatchObject({ italic: true });
  });
  it('ne produit jamais de balise dans le texte', () => {
    const runs = htmlToRuns('<img src=x onerror=alert(1)>Texte<a href="javascript:alert(1)">lien</a>');
    expect(runs.map((r) => r.text).join('')).toBe('Textelien');
  });
  it('convertit <br> et <div> en sauts de ligne, sans saut en tête ni en fin', () => {
    const runs = htmlToRuns('<div>Un</div><div>Deux<br></div>');
    expect(runs.map((r) => (r.br ? '|' : r.text)).join('')).toBe('Un|Deux');
  });
});

describe('chapterFromFirestore', () => {
  it('migre un chapitre v1 (HTML, exposants, notes, révisions)', () => {
    const chapter = chapterFromFirestore('c1', {
      title: '  Le phare  ',
      order: 3,
      blocks: [
        { type: 'heading', content: 'Arrivée' },
        { content: 'La tour fut achevée en 1889¹. <i>Magnifique</i>&nbsp;!' },
        { type: 'quote', content: 'Une citation²' },
        { content: '<br>' },
      ],
      notes: [
        { id: 'a', key: '1', content: 'Exposition universelle.' },
        { id: 'b', key: '2', content: 'Source inconnue.' },
        { id: 'c', key: '3', content: 'Jamais appelée.' },
        { id: 'm', category: 'margin', content: 'Pense-bête' },
      ],
      pendingReviews: [
        { id: 'r1', type: 'correction', original: '1887', suggestion: '1889', status: 'pending' },
        { id: 'r2', original: 'très très', suggestion: 'très', status: 'accepted' },
      ],
    });

    expect(chapter.title).toBe('Le phare');
    expect(chapter.order).toBe(3);
    expect(chapter.doc.content.map((b) => b.type)).toEqual(['heading', 'paragraph', 'blockquote']);

    const para = chapter.doc.content[1];
    expect(para.type === 'paragraph' && para.content?.some((n) => n.type === 'noteRef' && n.attrs.id === 'a')).toBe(true);
    expect(docToPlainText(chapter.doc)).toContain('Magnifique !');
    expect(docToPlainText(chapter.doc)).not.toContain('¹');

    const kinds = Object.fromEntries(chapter.notes.map((n) => [n.id, n.kind]));
    // Note appelée → note de bas de page ; jamais appelée ou marginale → pense-bête.
    expect(kinds).toEqual({ a: 'footnote', b: 'footnote', c: 'memo', m: 'memo' });

    expect(chapter.suggestions).toHaveLength(2);
    expect(chapter.suggestions[0]).toMatchObject({ kind: 'fact', original: '1887', replacement: '1889', status: 'pending' });
    expect(chapter.suggestions[1]).toMatchObject({ kind: 'style', status: 'accepted' });
    expect(chapter.wordCount).toBeGreaterThan(5);
  });

  it('migre les anciens paragraphes en texte brut', () => {
    const chapter = chapterFromFirestore('c2', { title: '', paragraphs: ['Premier.', '', 'Second.'] }, 7);
    expect(chapter.title).toBe('Chapitre sans titre');
    expect(chapter.order).toBe(7);
    expect(docToPlainText(chapter.doc)).toBe('Premier.\n\nSecond.');
  });

  it('assainit un chapitre v2 venu de Firestore', () => {
    const chapter = chapterFromFirestore('c3', {
      schema: 2,
      title: 'Titre',
      status: 'final',
      doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ok', marks: [{ type: 'link' }] }] }] },
      notes: [{ id: 'n', kind: 'memo', text: 'memo', links: [{ uri: 'javascript:alert(1)' }, { uri: 'https://ex.fr', title: 'Ex' }] }],
      suggestions: [{ original: 'x', kind: 'evil', verdict: 'nope', sources: [{ uri: 'data:text/html,x' }] }],
      updatedAt: { seconds: 10 },
    });
    expect(chapter.status).toBe('final');
    expect(chapter.doc.content[0]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'ok' }] });
    expect(chapter.notes[0].links).toEqual([{ title: 'Ex', uri: 'https://ex.fr' }]);
    expect(chapter.suggestions[0]).toMatchObject({ kind: 'style', verdict: undefined, sources: [] });
    expect(chapter.updatedAt).toBe(10_000);
  });

  it('distingue v1 et v2', () => {
    expect(isLegacyChapter({ blocks: [] })).toBe(true);
    expect(isLegacyChapter({ schema: 2 })).toBe(false);
    expect(isLegacyChapter({ doc: { type: 'doc', content: [] } })).toBe(false);
  });
});

describe('assainissement', () => {
  it('sanitizeNotes ignore les entrées invalides et borne les tailles', () => {
    const notes = sanitizeNotes([null, 'texte', { id: 'x'.repeat(100), text: 'y'.repeat(30_000), source: 'hack' }]);
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toHaveLength(64);
    expect(notes[0].text).toHaveLength(20_000);
    expect(notes[0].source).toBe('manual');
  });
  it('sanitizeSuggestions exige un passage original', () => {
    expect(sanitizeSuggestions([{ replacement: 'x' }, { original: 'a', status: 'weird' }])).toMatchObject([
      { original: 'a', status: 'pending' },
    ]);
  });
  it('toMillis gère Timestamp, Date, nombre et chaîne', () => {
    expect(toMillis({ toMillis: () => 42 })).toBe(42);
    expect(toMillis(new Date(5))).toBe(5);
    expect(toMillis(7)).toBe(7);
    expect(toMillis('1970-01-01T00:00:01Z')).toBe(1000);
    expect(toMillis('pas une date')).toBe(0);
  });
});
