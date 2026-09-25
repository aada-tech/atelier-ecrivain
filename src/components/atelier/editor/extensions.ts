import { Extension, Node, mergeAttributes, type Editor } from '@tiptap/react';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Slice, Fragment, type Node as PMNode } from '@tiptap/pm/model';
import { findTextRanges } from './find';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    noteRef: {
      insertNoteRef: (id: string) => ReturnType;
    };
  }
}

/** Appel de note : atome inline, numéroté automatiquement par compteur CSS. */
export const NoteRef = Node.create({
  name: 'noteRef',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-note-id'),
        renderHTML: (attrs) => ({ 'data-note-id': attrs.id }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-note-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, { class: 'note-ref', 'aria-label': 'Appel de note' })];
  },

  renderText() {
    return '';
  },

  addCommands() {
    return {
      insertNoteRef:
        (id: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { id } }),
    };
  },

  addProseMirrorPlugins() {
    const type = this.type;
    return [
      new Plugin({
        props: {
          // Un appel de note collé alors que la même note est déjà appelée est retiré
          // (évite deux numéros pour une seule note).
          transformPasted(slice, view) {
            const existing = new Set<string>();
            view.state.doc.descendants((n) => {
              if (n.type === type) existing.add(n.attrs.id);
            });
            if (!existing.size) return slice;
            const strip = (fragment: Fragment): Fragment => {
              const nodes: PMNode[] = [];
              fragment.forEach((child) => {
                if (child.type === type && existing.has(child.attrs.id)) return;
                nodes.push(child.content.size ? child.copy(strip(child.content)) : child);
              });
              return Fragment.fromArray(nodes);
            };
            return new Slice(strip(slice.content), slice.openStart, slice.openEnd);
          },
        },
      }),
    ];
  },
});

// ── Décorations : suggestions IA, texte de dictée en direct, recherche ─────

export interface GhostState {
  pos: number;
  text: string;
  pending: boolean;
}

interface DecoState {
  suggestions: { id: string; text: string }[];
  activeId: string | null;
  ghost: GhostState | null;
  search: string;
  decorations: DecorationSet;
}

export type DecoMeta = Partial<Omit<DecoState, 'decorations'>>;

export const atelierDecoKey = new PluginKey<DecoState>('atelierDecorations');

function build(state: EditorState, s: Omit<DecoState, 'decorations'>): DecorationSet {
  const decos: Decoration[] = [];
  for (const sug of s.suggestions) {
    const [range] = findTextRanges(state.doc, sug.text, { limit: 1 });
    if (range) {
      decos.push(
        Decoration.inline(range.from, range.to, {
          class: 'suggestion-mark',
          'data-suggestion-id': sug.id,
          'data-active': String(sug.id === s.activeId),
        }),
      );
    }
  }
  if (s.search.trim().length >= 2) {
    for (const r of findTextRanges(state.doc, s.search, { caseInsensitive: true, limit: 500 })) {
      decos.push(Decoration.inline(r.from, r.to, { class: 'search-hit' }));
    }
  }
  if (s.ghost) {
    const ghost = s.ghost;
    const pos = Math.min(Math.max(0, ghost.pos), state.doc.content.size);
    decos.push(
      Decoration.widget(
        pos,
        () => {
          const span = document.createElement('span');
          span.className = 'dictation-ghost';
          span.setAttribute('aria-live', 'polite');
          span.dataset.pending = String(ghost.pending);
          span.textContent = ghost.text ? ` ${ghost.text}` : ' ';
          return span;
        },
        { side: 1, key: `ghost-${ghost.pending}-${ghost.text}` },
      ),
    );
  }
  return DecorationSet.create(state.doc, decos);
}

export const AtelierDecorations = Extension.create({
  name: 'atelierDecorations',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecoState>({
        key: atelierDecoKey,
        state: {
          init: (_, state) => {
            const base = { suggestions: [], activeId: null, ghost: null, search: '' };
            return { ...base, decorations: build(state, base) };
          },
          apply(tr, prev, _old, newState) {
            const meta = tr.getMeta(atelierDecoKey) as DecoMeta | undefined;
            if (!meta && !tr.docChanged) return prev;
            const next = {
              suggestions: meta?.suggestions ?? prev.suggestions,
              activeId: meta?.activeId !== undefined ? meta.activeId : prev.activeId,
              ghost: meta?.ghost !== undefined ? meta.ghost : prev.ghost,
              search: meta?.search ?? prev.search,
            };
            if (next.ghost && tr.docChanged && meta?.ghost === undefined) {
              next.ghost = { ...next.ghost, pos: tr.mapping.map(next.ghost.pos) };
            }
            return { ...next, decorations: build(newState, next) };
          },
        },
        props: {
          decorations: (state) => atelierDecoKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});

export function setDecorations(editor: Editor, meta: DecoMeta) {
  if (editor.isDestroyed) return;
  editor.view.dispatch(editor.state.tr.setMeta(atelierDecoKey, meta).setMeta('addToHistory', false));
}

export function getGhost(editor: Editor): GhostState | null {
  return atelierDecoKey.getState(editor.state)?.ghost ?? null;
}
