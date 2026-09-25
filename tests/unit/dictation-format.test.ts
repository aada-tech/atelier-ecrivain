import { describe, expect, it } from 'vitest';
import { applyVoiceCommands, joinDictation, mergeSegment, splitParagraphs, tidy } from '@/lib/dictation/format';

const NB = ' ';

describe('commandes vocales', () => {
  it('convertit la ponctuation dictée', () => {
    expect(applyVoiceCommands('il pleuvait virgule la ville dormait point')).toBe('Il pleuvait, la ville dormait.');
    expect(applyVoiceCommands('tu viens point d’interrogation')).toBe(`Tu viens${NB}?`);
    expect(applyVoiceCommands("quelle horreur point d'exclamation")).toBe(`Quelle horreur${NB}!`);
    expect(applyVoiceCommands('attends point virgule écoute')).toBe(`Attends${NB}; écoute`);
  });

  it('gère les paragraphes et les guillemets', () => {
    expect(applyVoiceCommands('fin du jour point à la ligne le lendemain il partit')).toBe('Fin du jour.\n\nLe lendemain il partit');
    expect(applyVoiceCommands('elle dit ouvrez les guillemets bonjour fermez les guillemets')).toBe(`Elle dit «${NB}Bonjour${NB}»`);
  });

  it('ne convertit pas « point » au milieu d’une phrase', () => {
    expect(applyVoiceCommands('de ce point de vue il avait raison')).toBe('De ce point de vue il avait raison');
    expect(applyVoiceCommands('les deux points communs')).toBe('Les deux points communs');
    expect(applyVoiceCommands('voici la liste deux points')).toBe(`Voici la liste${NB}:`);
  });

  it('ne touche pas au « point » tant que le segment n’est pas final', () => {
    expect(applyVoiceCommands('il était une fois un point', false)).toBe('Il était une fois un point');
  });
});

describe('tidy', () => {
  it('normalise les espaces autour de la ponctuation', () => {
    expect(tidy('bonjour , monde .ceci')).toBe('Bonjour, monde. Ceci');
  });
});

describe('joinDictation', () => {
  it('ajoute une espace et garde la minuscule en milieu de phrase', () => {
    expect(joinDictation('Il marchait', 'et il pensait')).toBe(' et il pensait');
    expect(joinDictation('Il marchait', 'Et il pensait')).toBe(' et il pensait');
  });
  it('met une capitale en début de phrase', () => {
    expect(joinDictation('Il marchait.', 'la nuit tombait')).toBe(' La nuit tombait');
    expect(joinDictation('', 'la nuit tombait')).toBe('La nuit tombait');
  });
  it('conserve les noms propres', () => {
    expect(joinDictation('Il pensait à', 'Marie')).toBe(' Marie');
  });
  it('pas d’espace avant une virgule', () => {
    expect(joinDictation('Il marchait', ', lentement')).toBe(', lentement');
  });
});

describe('mergeSegment', () => {
  it('absorbe les résultats cumulatifs', () => {
    expect(mergeSegment('je suis', 'je suis là')).toBe('je suis là');
    expect(mergeSegment('je suis là', 'là')).toBe('je suis là');
  });
  it('fusionne les chevauchements de mots', () => {
    expect(mergeSegment('il faisait très froid ce soir', 'ce soir là')).toBe('il faisait très froid ce soir là');
  });
  it('concatène des segments distincts', () => {
    expect(mergeSegment('Bonjour.', 'Comment allez-vous')).toBe('Bonjour. Comment allez-vous');
  });
});

describe('splitParagraphs', () => {
  it('découpe sur les lignes vides', () => {
    expect(splitParagraphs('a\n\n b \n\n\n')).toEqual(['a', 'b']);
  });
});

describe('dialogue', () => {
  it('« deux points » suivi de guillemets', () => {
    expect(applyVoiceCommands('elle dit deux points ouvrez les guillemets viens fermez les guillemets')).toBe(
      `Elle dit${NB}: «${NB}Viens${NB}»`,
    );
  });
});
