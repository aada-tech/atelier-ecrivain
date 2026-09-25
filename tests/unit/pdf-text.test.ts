import { describe, expect, it } from 'vitest';
import { textFor } from '@/features/export/pdf/fonts';

describe('textFor (PDF)', () => {
  it('traduit les symboles absents de la police et retire l’inconnu', () => {
    expect(textFor('serif', 'Ouvrez ⌘ K, puis ⌥ D 🚀 !')).toBe('Ouvrez Cmd K, puis Alt D  !');
    expect(textFor('serif', 'fin⁂')).toBe('fin* * *');
  });

  it('garde la typographie française disponible dans Literata', () => {
    const text = '« Œuvre » — l’été… 12 €';
    expect(textFor('serif', text)).toBe(text);
    expect(textFor('serif', 'a b')).toBe('a b');
  });

  it('se limite à WinAnsi pour les polices standard', () => {
    expect(textFor('sans', '« ok » ⌘ ✓')).toBe('«\u00a0ok\u00a0» Cmd ');
  });
});
