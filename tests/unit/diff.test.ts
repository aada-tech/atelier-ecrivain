import { describe, expect, it } from 'vitest';
import { diffWords } from '@/lib/diff';

describe('diffWords', () => {
  it('isole le mot remplacé', () => {
    const d = diffWords('il marchait très très vite', 'il marchait très vite');
    expect(d.filter((s) => s.type === 'del').map((s) => s.text.trim())).toEqual(['très']);
    expect(d.some((s) => s.type === 'ins')).toBe(false);
  });
  it('reconstruit les deux textes', () => {
    const a = 'La nuit, froide et sombre, tombait.';
    const b = 'La nuit glaciale tombait lentement.';
    const d = diffWords(a, b);
    expect(
      d
        .filter((s) => s.type !== 'ins')
        .map((s) => s.text)
        .join(''),
    ).toBe(a);
    expect(
      d
        .filter((s) => s.type !== 'del')
        .map((s) => s.text)
        .join(''),
    ).toBe(b);
  });
});
