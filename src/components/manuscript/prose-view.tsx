import { Fragment, type ReactNode } from 'react';
import type { RenderBlock, Run } from '@/lib/doc/text';
import { cn } from '@/lib/utils';

export interface ProseHighlight {
  id: string;
  text: string;
  color: 'amber' | 'sage' | 'iris' | 'ember';
}

const HL_CLASS: Record<ProseHighlight['color'], string> = {
  amber: 'bg-amber/25',
  sage: 'bg-sage/20',
  iris: 'bg-iris/20',
  ember: 'bg-ember/20',
};

interface Props {
  blocks: RenderBlock[];
  className?: string;
  indent?: boolean;
  highlights?: ProseHighlight[];
  onNoteClick?: (noteId: string, number: number) => void;
  onHighlightClick?: (id: string) => void;
}

/**
 * Rendu React (sans HTML brut) d'un chapitre : liseuse, aperçu de version,
 * démonstrations de la landing. Le contenu est toujours échappé par React.
 */
export function ProseView({ blocks, className, indent, highlights = [], onNoteClick, onHighlightClick }: Props) {
  return (
    <div className={cn('manuscript-prose', className)} data-indent={indent ? 'true' : undefined}>
      {blocks.map((b, i) => {
        if (b.type === 'scene-break') return <hr key={i} />;
        const content = renderRuns(b.runs, highlights, onNoteClick, onHighlightClick);
        if (b.type === 'h2') return <h2 key={i}>{content}</h2>;
        if (b.type === 'h3') return <h3 key={i}>{content}</h3>;
        if (b.type === 'quote') return <blockquote key={i}><p>{content}</p></blockquote>;
        return <p key={i}>{content}</p>;
      })}
    </div>
  );
}

function renderRuns(
  runs: Run[],
  highlights: ProseHighlight[],
  onNoteClick?: Props['onNoteClick'],
  onHighlightClick?: Props['onHighlightClick'],
): ReactNode[] {
  return runs.map((r, i) => {
    if (r.kind === 'break') return <br key={i} />;
    if (r.kind === 'note') {
      return (
        <sup key={i}>
          <button
            type="button"
            className="note-ref !p-0 [counter-increment:none] after:!content-none"
            onClick={() => onNoteClick?.(r.id, r.number)}
            aria-label={`Note ${r.number}`}
          >
            {r.number}
          </button>
        </sup>
      );
    }
    let node: ReactNode = withHighlights(r.text, highlights, onHighlightClick);
    if (r.italic) node = <em>{node}</em>;
    if (r.bold) node = <strong>{node}</strong>;
    return <Fragment key={i}>{node}</Fragment>;
  });
}

function withHighlights(text: string, highlights: ProseHighlight[], onClick?: (id: string) => void): ReactNode {
  if (!highlights.length) return text;
  const parts: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest) {
    let best: { idx: number; h: ProseHighlight } | null = null;
    for (const h of highlights) {
      if (h.text.length < 2) continue;
      const idx = rest.indexOf(h.text);
      if (idx !== -1 && (!best || idx < best.idx)) best = { idx, h };
    }
    if (!best) {
      parts.push(rest);
      break;
    }
    if (best.idx > 0) parts.push(rest.slice(0, best.idx));
    const { h } = best;
    parts.push(
      <mark
        key={key++}
        className={cn('rounded-[3px] px-0.5 text-inherit', HL_CLASS[h.color], onClick && 'cursor-pointer')}
        onClick={onClick ? () => onClick(h.id) : undefined}
      >
        {h.text}
      </mark>,
    );
    rest = rest.slice(best.idx + h.text.length);
  }
  return parts;
}
