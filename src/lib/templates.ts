import type { DocNode } from './doc/types';
import { EMPTY_DOC } from './doc/types';
import { parseInline } from './import';

export interface Template {
  id: string;
  label: string;
  description: string;
  chapters: { title: string; doc: DocNode }[];
}

const blank = () => structuredClone(EMPTY_DOC);

function doc(...paras: string[]): DocNode {
  return {
    type: 'doc',
    content: paras.map((p) =>
      p.startsWith('## ')
        ? { type: 'heading', attrs: { level: 2 }, content: parseInline(p.slice(3)) }
        : p === '***'
          ? { type: 'horizontalRule' }
          : { type: 'paragraph', content: parseInline(p) },
    ),
  };
}

export const TEMPLATES: Template[] = [
  { id: 'blank', label: 'Page blanche', description: 'Un premier chapitre, rien d’autre.', chapters: [{ title: 'Chapitre 1', doc: blank() }] },
  {
    id: 'novel',
    label: 'Roman',
    description: 'Structure en trois actes.',
    chapters: [
      { title: 'L’élément déclencheur', doc: blank() },
      { title: 'Le point de non-retour', doc: blank() },
      { title: 'La crise', doc: blank() },
      { title: 'Le dénouement', doc: blank() },
    ],
  },
  {
    id: 'essay',
    label: 'Essai',
    description: 'Introduction, deux parties, conclusion.',
    chapters: [
      { title: 'Introduction', doc: blank() },
      { title: 'Première partie', doc: blank() },
      { title: 'Deuxième partie', doc: blank() },
      { title: 'Conclusion', doc: blank() },
    ],
  },
  {
    id: 'memoir',
    label: 'Récit de vie',
    description: 'Pour raconter, à voix haute, une histoire vraie.',
    chapters: [
      { title: 'Les origines', doc: blank() },
      { title: 'Les années de formation', doc: blank() },
      { title: 'Le tournant', doc: blank() },
      { title: 'Aujourd’hui', doc: blank() },
    ],
  },
  {
    id: 'guide',
    label: 'Visite guidée',
    description: 'Un court manuscrit qui montre chaque fonction.',
    chapters: [
      {
        title: 'Bienvenue dans l’Atelier',
        doc: doc(
          'Ce chapitre est à vous : modifiez-le, raturez-le, supprimez-le. Tout est enregistré automatiquement, même hors ligne.',
          '## Dicter',
          'Touchez le micro (ou **⌥ D**) et parlez naturellement. Dites « virgule », « point » ou « à la ligne » : la ponctuation suit. Vos mots s’inscrivent en direct là où se trouve le curseur.',
          '## Raturer',
          'Sélectionnez une phrase, puis *Raturer* : l’assistant propose des corrections ciblées, affichées en barré et en vert. Vous gardez toujours le dernier mot.',
          '## Vérifier',
          'La tour Eiffel a été inaugurée en 1887 pour l’Exposition universelle. Sélectionnez cette phrase puis *Vérifier* : les faits sont confrontés à des sources web.',
          '***',
          'Ouvrez la palette avec **⌘ K** pour tout le reste : versions, recherche documentaire, mode focus, export PDF et EPUB.',
        ),
      },
    ],
  },
];
