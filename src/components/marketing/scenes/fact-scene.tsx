'use client';

import { SuggestionCard } from '@/components/manuscript/suggestion-card';
import type { Suggestion } from '@/lib/doc/types';
import { AppChrome, InspectorTabs } from './app-chrome';
import { DemoCursor, moveAndClick, useScene, type SceneProps } from './use-scene';
import { cn } from '@/lib/utils';

const SOURCES = [
  { title: 'fr.wikipedia.org — Tour Eiffel', uri: 'https://fr.wikipedia.org/wiki/Tour_Eiffel' },
  { title: 'toureiffel.paris — Histoire', uri: 'https://www.toureiffel.paris/fr/le-monument/histoire' },
];

export const DEMO_FACTS: Suggestion[] = [
  {
    id: 'f1',
    kind: 'fact',
    original: 'inaugurée en 1887',
    replacement: 'inaugurée en 1889',
    verdict: 'error',
    explanation: 'La tour a été inaugurée le 31 mars 1889, pour l’Exposition universelle de 1889. Sa construction a commencé en 1887.',
    sources: SOURCES,
    status: 'pending',
    createdAt: 0,
  },
  {
    id: 'f2',
    kind: 'fact',
    original: 'haute de 300 mètres',
    replacement: '',
    verdict: 'confirmed',
    explanation: 'Environ 300 m à l’inauguration (312 m avec le mât du drapeau).',
    sources: SOURCES.slice(0, 1),
    status: 'pending',
    createdAt: 0,
  },
];

export function FactScene({ variant = 'desktop', playing, className, onLoop }: SceneProps) {
  const phone = variant === 'phone';
  const scope = useScene(
    (tl, q, root) => {
      tl.set(q('[data-scan]'), { autoAlpha: 0, top: '0%' })
        .set(q('[data-claim]'), { backgroundSize: '0% 2px' })
        .set(q('[data-card]'), { autoAlpha: 0, y: 18 })
        .set(q('[data-year-old]'), { autoAlpha: 1, width: 'auto' })
        .set(q('[data-year-new]'), { autoAlpha: 0, width: 0 })
        .set(q('[data-status]'), { autoAlpha: 0 })
        .set(q('[data-cursor]'), { autoAlpha: 0, x: 80, y: 60 });

      tl.to(q('[data-status]'), { autoAlpha: 1, duration: 0.3 }, 0.3);
      tl.to(q('[data-scan]'), { autoAlpha: 1, duration: 0.2 }, 0.4);
      tl.to(q('[data-scan]'), { top: '100%', duration: 1.6, ease: 'power1.inOut' }, 0.4);
      tl.to(q('[data-scan]'), { autoAlpha: 0, duration: 0.2 });
      tl.to(q('[data-status]'), { autoAlpha: 0, duration: 0.3 }, '<');
      tl.to(q('[data-claim]'), { backgroundSize: '100% 2px', duration: 0.5, stagger: 0.25 });
      tl.to(q('[data-card]'), { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.2 }, '<0.2');
      tl.addLabel('still', '+=0.5');
      moveAndClick(tl, root, '[data-cursor]', '[data-card="f1"] button', 'still');
      tl.to(q('[data-year-old]'), { autoAlpha: 0, width: 0, duration: 0.35 }, '+=0.1');
      tl.to(q('[data-year-new]'), { autoAlpha: 1, width: 'auto', duration: 0.35 }, '<0.15');
      tl.to(q('[data-claim="f1"]'), { backgroundImage: 'linear-gradient(var(--c-sage), var(--c-sage))', duration: 0.3 }, '<');
      tl.to(q('[data-card="f1"]'), { autoAlpha: 0, height: 0, marginBottom: 0, duration: 0.4 }, '+=0.2');
      tl.to(q('[data-cursor]'), { autoAlpha: 0, duration: 0.3 }, '<');
      tl.to({}, { duration: 2 });
      tl.set(q('[data-card="f1"]'), { height: 'auto', marginBottom: 8 });
    },
    { playing, onLoop },
  );

  const cards = (
    <div className="space-y-2">
      {DEMO_FACTS.map((f) => (
        <div key={f.id} data-card={f.id} className="overflow-hidden" style={{ marginBottom: 8 }}>
          <SuggestionCard suggestion={f} onAccept={() => {}} onReject={() => {}} className="p-3 [&_p]:text-[12px]" />
        </div>
      ))}
    </div>
  );

  const underline = (color: string) => ({
    backgroundImage: `linear-gradient(${color}, ${color})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '0 100%',
  });

  return (
    <div ref={scope} className={cn('relative h-full w-full', className)}>
      <AppChrome
        variant={variant}
        inspector={
          phone ? undefined : (
            <div className="p-3 pt-0">
              <InspectorTabs />
              <div className="mt-2">{cards}</div>
            </div>
          )
        }
      >
        <div data-scene className={cn('relative h-full overflow-hidden', phone ? 'px-5 pt-6' : 'px-8 pt-8 lg:px-12')}>
          <p className="font-mono text-[9.5px] tracking-[0.2em] text-faint uppercase">Chapitre 5 · Essai</p>
          <h3 className={cn('mt-1.5 mb-4 font-display leading-none', phone ? 'text-[30px]' : 'text-[34px]')}>Le fer et le ciel</h3>
          <div
            className="manuscript-prose relative"
            style={{ ['--prose-size' as string]: phone ? '15px' : '15.5px', ['--prose-leading' as string]: '1.75' }}
          >
            <p>
              Quand Gustave Eiffel présenta son projet, on le traita de « lampadaire tragique ». La tour,{' '}
              <span data-claim="f1" style={underline('var(--c-danger)')}>
                inaugurée en{' '}
                <span data-year-old className="inline-block overflow-hidden align-bottom">
                  1887
                </span>
                <span data-year-new className="inline-block overflow-hidden align-bottom text-sage">
                  1889
                </span>
              </span>{' '}
              et{' '}
              <span data-claim="f2" style={underline('var(--c-sage)')}>
                haute de 300 mètres
              </span>
              , devint pourtant le symbole d’un siècle qui croyait au progrès.
            </p>
            <p className="text-muted">Il fallut une génération pour que Paris l’aime.</p>
            <div
              data-scan
              className="pointer-events-none absolute inset-x-[-12px] h-10 -translate-y-1/2 bg-gradient-to-b from-transparent via-sage/25 to-transparent"
            />
          </div>
          <p
            data-status
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sage-soft px-3 py-1 text-[11.5px] font-medium text-sage"
          >
            <span className="size-1.5 animate-ping rounded-full bg-sage" /> Recherche Google en cours…
          </p>
          {phone && <div className="absolute inset-x-3 bottom-3 [&_article]:shadow-pop">{cards}</div>}
          <DemoCursor />
        </div>
      </AppChrome>
    </div>
  );
}
