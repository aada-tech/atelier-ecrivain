'use client';

import { Bold, Heading2, Italic, Quote, ScanSearch, Sparkles, StickyNote, Check } from 'lucide-react';
import { SuggestionCard } from '@/components/manuscript/suggestion-card';
import { diffWords } from '@/lib/diff';
import type { Suggestion } from '@/lib/doc/types';
import { AppChrome, InspectorTabs } from './app-chrome';
import { DemoCursor, moveAndClick, useScene, type SceneProps } from './use-scene';
import { cn } from '@/lib/utils';

const BEFORE = 'Il marchait ';
const AFTER = ', en pensant à elle. Au bout, la lanterne du phare clignotait à peine.';

export const DEMO_RATURE: Suggestion = {
  id: 'demo-rature',
  kind: 'style',
  original: 'très très lentement le long de la jetée sombre et obscure',
  replacement: 'lentement le long de la jetée obscure',
  explanation: 'Répétition (« très très ») et pléonasme (« sombre et obscure ») : la phrase gagne en rythme.',
  status: 'pending',
  createdAt: 0,
};

const SEGMENTS = diffWords(DEMO_RATURE.original, DEMO_RATURE.replacement);

export function RatureScene({ variant = 'desktop', playing, className, onLoop }: SceneProps) {
  const phone = variant === 'phone';
  const scope = useScene(
    (tl, q, root) => {
      tl.set(q('[data-sel]'), { backgroundSize: '0% 100%' })
        .set(q('[data-bubble]'), { autoAlpha: 0, y: 8, scale: 0.96 })
        .set(q('[data-mark]'), { borderBottomColor: 'transparent', backgroundColor: 'transparent' })
        .set(q('[data-card]'), { autoAlpha: 0, x: phone ? 0 : 24, y: phone ? 60 : 0 })
        .set(q('[data-del]'), {
          display: 'inline-block',
          width: 'auto',
          autoAlpha: 1,
          color: 'inherit',
          textDecorationColor: 'transparent',
        })
        .set(q('[data-ins]'), { width: 0, autoAlpha: 0 })
        .set(q('[data-done]'), { autoAlpha: 0, y: 6 })
        .set(q('[data-cursor]'), { autoAlpha: 0, x: 60, y: 200 });

      moveAndClick(tl, root, '[data-cursor]', '[data-sel]', 0.4, false);
      tl.to(q('[data-sel]'), { backgroundSize: '100% 100%', duration: 1, ease: 'power1.inOut' });
      tl.to(q('[data-bubble]'), { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(2)' });
      moveAndClick(tl, root, '[data-cursor]', '[data-bubble] [data-raturer]', '+=0.2');
      tl.to(q('[data-bubble]'), { autoAlpha: 0, y: 6, duration: 0.2 }, '+=0.1');
      tl.to(q('[data-sel]'), { backgroundSize: '0% 100%', duration: 0.3 }, '<');
      tl.to(q('[data-mark]'), {
        borderBottomColor: 'var(--c-iris)',
        backgroundColor: 'color-mix(in oklab, var(--c-iris) 14%, transparent)',
        duration: 0.4,
      });
      tl.to(q('[data-card]'), { autoAlpha: 1, x: 0, y: 0, duration: 0.6 }, '<0.1');
      tl.addLabel('still', '+=0.6');
      moveAndClick(tl, root, '[data-cursor]', '[data-card] button', 'still');
      // Application : le texte barré disparaît, le nouveau texte s'insère.
      tl.to(q('[data-del]'), { color: 'var(--c-danger)', textDecorationColor: 'var(--c-danger)', duration: 0.25 }, '+=0.05');
      tl.to(q('[data-del]'), { width: 0, autoAlpha: 0, duration: 0.5, ease: 'power2.inOut' }, '+=0.35');
      tl.set(q('[data-del]'), { display: 'none' });
      tl.to(q('[data-ins]'), { width: 'auto', autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, '<');
      tl.to(q('[data-mark]'), { borderBottomColor: 'transparent', backgroundColor: 'transparent', duration: 0.4 }, '<0.3');
      tl.to(q('[data-card]'), { autoAlpha: 0, y: phone ? 40 : -8, duration: 0.35 }, '<');
      tl.to(q('[data-done]'), { autoAlpha: 1, y: 0, duration: 0.35 }, '<0.2');
      tl.to(q('[data-cursor]'), { autoAlpha: 0, duration: 0.3 }, '<');
      tl.to({}, { duration: 2.2 });
    },
    { playing, onLoop },
  );

  const inspector = (
    <div className="p-3 pt-0">
      <InspectorTabs />
      <div data-card className="mt-2">
        <SuggestionCard suggestion={DEMO_RATURE} onAccept={() => {}} onReject={() => {}} className="p-3 [&_p]:text-[12.5px]" />
      </div>
      <p data-done className="mt-3 flex items-center gap-2 rounded-lg bg-sage-soft px-3 py-2 text-[11.5px] text-sage">
        <Check className="size-3.5" /> Rature appliquée · ⌘Z pour annuler
      </p>
    </div>
  );

  return (
    <div ref={scope} className={cn('relative h-full w-full', className)}>
      <AppChrome variant={variant} inspector={phone ? undefined : inspector}>
        <div data-scene className={cn('relative h-full overflow-hidden', phone ? 'px-5 pt-6' : 'px-8 pt-8 lg:px-12')}>
          <p className="font-mono text-[9.5px] tracking-[0.2em] text-faint uppercase">Chapitre 3 · 1 219 mots</p>
          <h3 className={cn('mt-1.5 mb-4 font-display leading-none', phone ? 'text-[30px]' : 'text-[34px]')}>Le phare</h3>
          <div
            className="manuscript-prose relative"
            style={{ ['--prose-size' as string]: phone ? '15px' : '15.5px', ['--prose-leading' as string]: '1.75' }}
          >
            <p>La mer montait sous les falaises, et le vent portait jusqu’à nous l’odeur du sel.</p>
            <p className="relative">
              {BEFORE}
              <span
                data-sel
                className="[box-decoration-break:clone] bg-no-repeat"
                style={{
                  backgroundImage:
                    'linear-gradient(color-mix(in oklab, var(--c-iris) 26%, transparent), color-mix(in oklab, var(--c-iris) 26%, transparent))',
                }}
              >
                <span data-mark className="border-b-2 [box-decoration-break:clone]">
                  {SEGMENTS.map((seg, i) =>
                    seg.type === 'same' ? (
                      <span key={i}>{seg.text}</span>
                    ) : seg.type === 'del' ? (
                      <span key={i} data-del className="inline-block overflow-hidden align-bottom whitespace-pre line-through">
                        {seg.text}
                      </span>
                    ) : (
                      <span key={i} data-ins className="inline-block overflow-hidden align-bottom whitespace-pre text-sage">
                        {seg.text}
                      </span>
                    ),
                  )}
                </span>
              </span>
              {AFTER}
              <span
                data-bubble
                className="absolute -top-11 left-0 z-20 flex items-center gap-0.5 rounded-xl border border-border bg-surface p-1 font-sans shadow-lift"
              >
                {[Bold, Italic, Heading2, Quote].map((Icon, i) => (
                  <span key={i} className={cn('grid size-7 place-items-center rounded-lg text-muted', i > 1 && '@max-md:hidden')}>
                    <Icon className="size-3.5" />
                  </span>
                ))}
                <span className="mx-0.5 h-4 w-px bg-border" />
                <span className="grid size-7 place-items-center text-muted">
                  <StickyNote className="size-3.5" />
                </span>
                <span data-raturer className="flex h-7 items-center gap-1 rounded-lg bg-iris-soft px-2 text-[11.5px] font-medium text-iris">
                  <Sparkles className="size-3" /> Raturer
                </span>
                <span className="flex h-7 items-center gap-1 px-2 text-[11.5px] font-medium text-sage">
                  <ScanSearch className="size-3" /> Vérifier
                </span>
              </span>
            </p>
          </div>
          {phone && (
            <div className="absolute inset-x-3 bottom-3">
              <div data-card>
                <SuggestionCard
                  suggestion={DEMO_RATURE}
                  onAccept={() => {}}
                  onReject={() => {}}
                  className="p-3 shadow-pop [&_p]:text-[12.5px]"
                />
              </div>
              <p
                data-done
                className="absolute inset-x-0 bottom-0 flex items-center gap-2 rounded-lg bg-sage-soft px-3 py-2 text-[11.5px] text-sage"
              >
                <Check className="size-3.5" /> Rature appliquée · ⌘Z pour annuler
              </p>
            </div>
          )}
          <DemoCursor />
        </div>
      </AppChrome>
    </div>
  );
}
