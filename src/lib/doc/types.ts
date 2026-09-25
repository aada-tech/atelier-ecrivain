/**
 * Modèle de données du manuscrit (schéma v2).
 *
 * Le contenu d'un chapitre est un document ProseMirror/TipTap restreint :
 * doc > (paragraph | heading[2,3] | blockquote > paragraph | horizontalRule)
 * Nœuds inline : text (marques bold / italic), hardBreak, noteRef (appel de note).
 * Tout contenu hors schéma est éliminé à l'import : aucun HTML brut n'est
 * jamais stocké ni réinjecté dans le DOM.
 */

export type MarkType = 'bold' | 'italic';

export interface TextNode {
  type: 'text';
  text: string;
  marks?: { type: MarkType }[];
}

export interface HardBreakNode {
  type: 'hardBreak';
}

export interface NoteRefNode {
  type: 'noteRef';
  attrs: { id: string };
}

export type InlineNode = TextNode | HardBreakNode | NoteRefNode;

export interface ParagraphNode {
  type: 'paragraph';
  content?: InlineNode[];
}

export interface HeadingNode {
  type: 'heading';
  attrs: { level: 2 | 3 };
  content?: InlineNode[];
}

export interface BlockquoteNode {
  type: 'blockquote';
  content: ParagraphNode[];
}

export interface HorizontalRuleNode {
  type: 'horizontalRule';
}

export type BlockNode = ParagraphNode | HeadingNode | BlockquoteNode | HorizontalRuleNode;

export interface DocNode {
  type: 'doc';
  content: BlockNode[];
}

export type NoteKind = 'footnote' | 'memo';

export interface Note {
  id: string;
  kind: NoteKind;
  text: string;
  source: 'manual' | 'ai' | 'research';
  createdAt: number;
  /** Sources web (recherche documentaire). */
  links?: { title: string; uri: string }[];
}

export type SuggestionKind = 'style' | 'fact' | 'dictation';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';
export type FactVerdict = 'confirmed' | 'caution' | 'error' | 'unverified';

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  /** Passage exact visé dans le texte. */
  original: string;
  /** Proposition de remplacement (vide si simple remarque). */
  replacement: string;
  explanation?: string;
  verdict?: FactVerdict;
  sources?: { title: string; uri: string }[];
  status: SuggestionStatus;
  createdAt: number;
}

export type ChapterStatus = 'draft' | 'revision' | 'final';

export interface Chapter {
  id: string;
  title: string;
  order: number;
  status: ChapterStatus;
  doc: DocNode;
  notes: Note[];
  suggestions: Suggestion[];
  wordCount: number;
  updatedAt: number;
  updatedBy?: string;
}

export interface ManuscriptGoal {
  targetWords?: number;
  deadline?: string;
}

export interface Manuscript {
  id: string;
  title: string;
  subtitle?: string;
  genre?: string;
  accent?: string;
  createdAt: number;
  updatedAt: number;
  wordCount: number;
  chapterCount: number;
  goal?: ManuscriptGoal;
}

export const EMPTY_DOC: DocNode = { type: 'doc', content: [{ type: 'paragraph' }] };

export const CURRENT_SCHEMA = 2;
