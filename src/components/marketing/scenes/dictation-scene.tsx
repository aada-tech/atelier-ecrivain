'use client';

import { Fragment, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { DictationDock } from '@/components/atelier/dictation-dock';
import type { DictationState } from '@/components/atelier/use-dictation';
import { applyVoiceCommands } from '@/lib/dictation/format';
import { AppChrome } from './app-chrome';
import { DemoCursor, moveAndClick, useScene, type SceneProps } from './use-scene';
import { cn } from '@/lib/utils';

type Token = string | { cmd: string; out: string };

/** Ce que l'auteur dit, mot pour mot — commandes vocales comprises. */
const SPOKEN: Token[] = [
  'la',
  'mer',
  'montait',
  'sous',
  'les',
  'falaises',
  { cmd: 'virgule', out: ',' },
  'et',
  'le',
  'vent',
  'portait',
  'jusqu’à',
  'nous',
  'l’odeur',
  'du',
  'sel',
  { cmd: 'point à la ligne', out: '.' },
  'je',
  'n’avais',
  'jamais',
  'vu',
  'Marthe',
  'aussi',
  'calme',
  { cmd: 'point', out: '.' },
];

const SPOKEN_TEXT = SPOKEN.map((t) => (typeof t === 'string' ? t : t.cmd)).join(' ');
/** Le texte écrit est produit par la vraie logique de l'atelier. */
const WRITTEN = applyVoiceCommands(SPOKEN_TEXT).split('\n\n');

const IDLE: DictationState = { phase: 'idle', engine: null, live: '', level: 0, speaking: false, elapsed: 0, error: null };

export function DictationScene({ variant = 'desktop', playing, className, onLoop }: SceneProps) {
  const [dock, setDock] = useState<DictationState>(IDLE);

  const scope = useScene(
    (tl, q, root) => {
      const words = q('[data-w]');
      const chips = q('[data-chip]');
      tl.set(words, { autoAlpha: 0, y: 6 })
        .set(chips, { autoAlpha: 0, scale: 0.6, width: 'auto', paddingLeft: 8, paddingRight: 8, marginLeft: 4, marginRight: 4 })
        .set(q('[data-punct]'), { autoAlpha: 0 })
        .set(q('[data-live]'), { autoAlpha: 1 })
        .set(q('[data-written]'), { autoAlpha: 0 })
        .set(q('[data-toast]'), { autoAlpha: 0, y: 16 })
        .set(q('[data-cursor]'), { autoAlpha: 0, x: 40, y: 40 })
        .call(() => setDock(IDLE));

      moveAndClick(tl, root, '[data-cursor]', '[data-dock] button', 0.5);
      tl.call(() => setDock({ ...IDLE, phase: 'listening', engine: 'hybrid', level: 0.65, speaking: true }));
      tl.to('[data-cursor]', { autoAlpha: 0, duration: 0.3 }, '+=0.2');

      // Mots dictés, en direct, au rythme de la parole.
      let t = 1.9;
      SPOKEN.forEach((tok, i) => {
        if (typeof tok === 'string') {
          tl.to(`[data-w="${i}"]`, { autoAlpha: 1, y: 0, duration: 0.25 }, t);
          t += 0.16 + Math.min(0.12, tok.length * 0.012);
        } else {
          tl.to(`[data-chip="${i}"]`, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2.5)' }, t);
          tl.to(
            `[data-chip="${i}"]`,
            {
              autoAlpha: 0,
              scale: 0.4,
              width: 0,
              paddingLeft: 0,
              paddingRight: 0,
              marginLeft: 0,
              marginRight: 0,
              duration: 0.3,
              ease: 'power2.in',
            },
            t + 0.55,
          );
          tl.to(`[data-punct="${i}"]`, { autoAlpha: 1, duration: 0.25 }, t + 0.7);
          t += 0.95;
        }
      });
      for (let s = 1; s <= Math.ceil(t); s++) tl.call(() => setDock((d) => ({ ...d, elapsed: s })), undefined, s);

      tl.addLabel('insert', t + 0.3);
      moveAndClick(tl, root, '[data-cursor]', '[data-dock] button:last-of-type', 'insert');
      tl.call(() => setDock((d) => ({ ...d, phase: 'processing', level: 0 })));
      tl.to(q('[data-live]'), { autoAlpha: 0, filter: 'blur(3px)', duration: 0.45 }, '+=0.6');
      tl.fromTo(q('[data-written]'), { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '<0.1');
      tl.call(() => setDock(IDLE));
      tl.to(q('[data-toast]'), { autoAlpha: 1, y: 0, duration: 0.4, ease: 'back.out(2)' }, '<');
      tl.to('[data-cursor]', { autoAlpha: 0, duration: 0.3 }, '<');
      tl.addLabel('still');
      tl.to(q('[data-toast]'), { autoAlpha: 0, y: 10, duration: 0.3 }, '+=1.8');
      tl.to(q('[data-written]'), { autoAlpha: 0, duration: 0.4 }, '+=0.2');
    },
    { playing, onLoop },
  );

  const page = (
    <div data-scene className={cn('relative h-full overflow-hidden', variant === 'phone' ? 'px-5 pt-6' : 'px-8 pt-8 lg:px-14')}>
      <p className="font-mono text-[9.5px] tracking-[0.2em] text-faint uppercase">Chapitre 3 · 1 204 mots</p>
      <h3 className={cn('mt-1.5 mb-4 font-display leading-none', variant === 'phone' ? 'text-[30px]' : 'text-[34px]')}>Le phare</h3>
      <div
        className="manuscript-prose"
        style={{ ['--prose-size' as string]: variant === 'phone' ? '15px' : '15.5px', ['--prose-leading' as string]: '1.7' }}
      >
        <p>Nous étions arrivés à la nuit tombée. Le gardien nous attendait sur le quai, une lampe à la main, sans un mot.</p>
        <div className="grid [&>*]:[grid-area:1/1]">
          <p data-live className="text-iris italic">
            {SPOKEN.map((tok, i) =>
              typeof tok === 'string' ? (
                <Fragment key={i}>
                  {i > 0 ? ' ' : null}
                  <span data-w={i} className="inline-block">
                    {tok}
                  </span>
                </Fragment>
              ) : (
                <Fragment key={i}>
                  <span
                    data-chip={i}
                    className="mx-1 inline-block overflow-hidden rounded-full bg-iris-soft px-2 align-[0.1em] font-sans text-[0.62em] leading-[1.6] font-semibold whitespace-nowrap text-iris not-italic"
                  >
                    {tok.cmd}
                  </span>
                  <span data-punct={i} className="text-text not-italic">
                    {tok.out}
                  </span>
                  {tok.cmd.includes('ligne') ? <br /> : null}
                </Fragment>
              ),
            )}
            <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-caret bg-iris" />
          </p>
          <div data-written>
            {WRITTEN.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </div>
      <div
        data-toast
        className="absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-[12px] whitespace-nowrap shadow-lift"
      >
        <CircleCheck className="size-4 text-sage" /> Dictée insérée
        <span className="ml-2 text-[11px] font-medium text-muted">Annuler</span>
      </div>
      <div data-dock className="@container absolute inset-x-0 bottom-5 flex justify-center px-3">
        <DictationDockDemo state={dock} />
      </div>
      <DemoCursor />
    </div>
  );

  return (
    <div ref={scope} className={cn('relative h-full w-full', className)}>
      <AppChrome variant={variant}>{page}</AppChrome>
    </div>
  );
}

const noop = () => {};

/** Le vrai dock de dictée de l'atelier, piloté par la démo. */
function DictationDockDemo({ state }: { state: DictationState }) {
  return <DictationDock state={state} maxSeconds={360} onStart={noop} onStop={noop} onPause={noop} onResume={noop} onCancel={noop} />;
}
