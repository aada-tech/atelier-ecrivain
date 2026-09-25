'use client';

import { List, Type, Volume2 } from 'lucide-react';
import { ProseView } from '@/components/manuscript/prose-view';
import { docToRenderBlocks } from '@/lib/doc/text';
import type { DocNode } from '@/lib/doc/types';
import { useScene, type SceneProps } from './use-scene';
import { cn } from '@/lib/utils';

const PAGE_1: DocNode = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Le phare n’avait pas été allumé depuis la guerre. Marthe disait que la lumière attirait les ' },
        { type: 'text', text: 'souvenirs', marks: [{ type: 'italic' }] },
        { type: 'text', text: ', comme les phalènes.' },
        { type: 'noteRef', attrs: { id: 'n1' } },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Je montai les cent douze marches en comptant à voix basse. Au sommet, la lentille dormait sous une bâche grise, et la mer, en dessous, ne faisait plus aucun bruit.',
        },
      ],
    },
  ],
};

const PAGE_2: DocNode = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Il y a des silences qu’on ne rompt pas. On les habite, comme une maison dont on n’aurait pas la clé.' },
      ],
    },
    { type: 'paragraph', content: [{ type: 'text', text: 'Quand j’allumai la lampe, toute la côte sembla retenir son souffle.' }] },
  ],
};

const THEMES = [
  { bg: '#fffdf8', fg: '#17151f', muted: '#948e9c', chrome: '#f6f3ec' },
  { bg: '#fbf3e3', fg: '#3a2e22', muted: '#9c8a73', chrome: '#f1e6d2' },
  { bg: '#15151c', fg: '#eeebf3', muted: '#6f6b7c', chrome: '#0b0b10' },
];

export function ReaderScene({ variant = 'desktop', playing, className, onLoop }: SceneProps) {
  const phone = variant === 'phone';
  const scope = useScene(
    (tl, q) => {
      const paint = (i: number) => ({
        '--rs-bg': THEMES[i].bg,
        '--rs-fg': THEMES[i].fg,
        '--rs-muted': THEMES[i].muted,
        '--rs-chrome': THEMES[i].chrome,
      });
      tl.set(q('[data-reader]'), paint(0))
        .set(q('[data-turn]'), { rotateY: 0, autoAlpha: 1 })
        .set(q('[data-hl]'), { backgroundSize: '0% 100%' })
        .set(q('[data-note]'), { autoAlpha: 0, y: 30 })
        .set(q('[data-bar]'), { width: '38%' })
        .call(() => q('[data-pageno]').forEach((el) => (el.textContent = '41 / 212')));

      // Tourne-page.
      tl.to(q('[data-turn]'), { rotateY: -165, duration: 1.1, ease: 'power2.inOut' }, 0.8);
      tl.to(q('[data-turn-shade]'), { opacity: 0.35, duration: 0.55, yoyo: true, repeat: 1 }, '<');
      tl.set(q('[data-turn]'), { autoAlpha: 0 });
      tl.to(q('[data-bar]'), { width: '39%', duration: 0.4 }, '<');
      tl.call(() => q('[data-pageno]').forEach((el) => (el.textContent = '42 / 212')), undefined, '<');
      // Surlignage.
      tl.to(q('[data-hl]'), { backgroundSize: '100% 100%', duration: 1, ease: 'power1.inOut' }, '+=0.4');
      // Note de bas de page.
      tl.to(q('[data-note]'), { autoAlpha: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' }, '+=0.4');
      tl.addLabel('still');
      tl.to(q('[data-note]'), { autoAlpha: 0, y: 30, duration: 0.35 }, '+=1.4');
      // Jour → sépia → nuit.
      tl.to(q('[data-reader]'), { ...paint(1), duration: 0.8, ease: 'power1.inOut' }, '+=0.2');
      tl.to(q('[data-reader]'), { ...paint(2), duration: 0.8, ease: 'power1.inOut' }, '+=0.8');
      tl.to({}, { duration: 1.6 });
    },
    { playing, onLoop },
  );

  const page = (doc: DocNode, highlight?: boolean) => (
    <div
      className="h-full px-[9%] pt-[8%]"
      style={{ ['--prose-size' as string]: phone ? '15px' : '16px', ['--prose-leading' as string]: '1.75' }}
    >
      <div className="manuscript-prose [&_*]:!text-[var(--rs-fg)] [&_.note-ref]:!text-ember">
        {highlight ? (
          <>
            <p>
              <span
                data-hl
                className="[box-decoration-break:clone] bg-no-repeat"
                style={{
                  backgroundImage:
                    'linear-gradient(color-mix(in oklab, var(--c-amber) 38%, transparent), color-mix(in oklab, var(--c-amber) 38%, transparent))',
                }}
              >
                Il y a des silences qu’on ne rompt pas. On les habite, comme une maison dont on n’aurait pas la clé.
              </span>
            </p>
            <ProseView blocks={docToRenderBlocks({ type: 'doc', content: doc.content.slice(1) })} indent />
          </>
        ) : (
          <ProseView blocks={docToRenderBlocks(doc)} indent />
        )}
      </div>
    </div>
  );

  return (
    <div ref={scope} className={cn('relative h-full w-full', className)}>
      <div
        data-reader
        className="relative flex h-full flex-col overflow-hidden"
        style={{ background: 'var(--rs-bg)', color: 'var(--rs-fg)' }}
      >
        <div className="flex h-11 shrink-0 items-center gap-2 px-4 text-[var(--rs-muted)]" style={{ background: 'var(--rs-chrome)' }}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-[var(--rs-fg)]">Le Phare</p>
            <p className="truncate text-[10px]">Chapitre 3 · Le phare</p>
          </div>
          <Volume2 className="size-4" />
          <Type className="size-4" />
          <List className="size-4" />
        </div>
        <div className="relative min-h-0 flex-1 [perspective:1400px]">
          <div className="absolute inset-0">{page(PAGE_2, true)}</div>
          <div
            data-turn
            className="absolute inset-0 [transform-origin:left_center] [backface-visibility:hidden]"
            style={{ background: 'var(--rs-bg)' }}
          >
            {page(PAGE_1)}
            <div data-turn-shade className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/40 to-transparent opacity-0" />
          </div>
          <div
            data-note
            className="absolute inset-x-3 bottom-3 rounded-2xl border border-border bg-surface p-4 text-text shadow-pop"
            data-theme="light"
          >
            <p className="font-display text-lg">Note 1</p>
            <p className="mt-1 font-serif text-[13px] leading-relaxed text-muted">
              Les phalènes sont des papillons de nuit ; Marthe tenait l’expression de sa grand-mère.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 pt-1 pb-3 text-[10px] text-[var(--rs-muted)]">
          <span>39 %</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--rs-muted)]/25">
            <div data-bar className="h-full rounded-full bg-ember" />
          </div>
          <span data-pageno>41 / 212</span>
        </div>
      </div>
    </div>
  );
}
