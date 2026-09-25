'use client';

import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { BookOpenText, FileDown, Mic, ScanSearch, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrowserFrame, PhoneFrame } from './device';
import { DictationScene } from './scenes/dictation-scene';
import { RatureScene } from './scenes/rature-scene';
import { FactScene } from './scenes/fact-scene';
import { ExportScene } from './scenes/export-scene';
import { ReaderScene } from './scenes/reader-scene';
import { SectionHeading } from './reveal';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS = [
  {
    n: '01',
    icon: Mic,
    tag: 'Dicter',
    title: 'Parlez comme vous pensez.',
    text: 'Vos mots s’inscrivent en direct, là où se trouve le curseur. Dites « virgule », « point », « à la ligne » : la ponctuation suit. Sur ordinateur, l’IA affine ensuite la transcription et repère vos repentirs.',
    Scene: DictationScene,
  },
  {
    n: '02',
    icon: Sparkles,
    tag: 'Raturer',
    title: 'L’IA rature. Vous décidez.',
    text: 'Sélectionnez un passage : l’assistant propose des corrections ciblées — répétitions, lourdeurs, typographie — en barré et en vert. Rien ne change sans votre accord, et tout s’annule d’un ⌘Z.',
    Scene: RatureScene,
  },
  {
    n: '03',
    icon: ScanSearch,
    tag: 'Vérifier',
    title: 'Des faits, et leurs sources.',
    text: 'Dates, chiffres, citations : chaque affirmation est confrontée à une recherche Google. Verdict clair, correction proposée, liens vers les sources. Pour écrire juste, sans quitter la page.',
    Scene: FactScene,
  },
  {
    n: '04',
    icon: FileDown,
    tag: 'Composer',
    title: 'Du manuscrit au livre.',
    text: 'Dix styles éditoriaux, formats A5, poche ou 6×9 pour l’impression à la demande, sommaire, notes, couverture importée ou illustrée par IA. Un PDF prêt pour l’imprimeur, un EPUB prêt pour la liseuse.',
    Scene: ExportScene,
  },
  {
    n: '05',
    icon: BookOpenText,
    tag: 'Relire',
    title: 'Relisez comme un lecteur.',
    text: 'Liseuse paginée, jour, sépia ou nuit, surlignages synchronisés, lecture à voix haute. Le recul qu’il faut pour la dernière passe — sans imprimer une page.',
    Scene: ReaderScene,
  },
];

export function FeatureStory() {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLElement>(null);

  // La mise en page (bureau / mobile) est choisie en CSS : aucun décalage à l'hydratation.
  // Les déclencheurs de défilement n'existent qu'au-delà de 1024 px.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        gsap.utils.toArray<HTMLElement>('[data-step]').forEach((el, i) => {
          ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => self.isActive && setActive(i) });
        });
        gsap.fromTo(
          '[data-progress]',
          { scaleY: 0 },
          { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '[data-steps]', start: 'top 55%', end: 'bottom 55%', scrub: true } },
        );
      });
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: root },
  );

  return (
    <section ref={root} id="fonctionnalites" className="relative py-28 sm:py-36" aria-labelledby="story-title">
      <div className="container-page">
        <SectionHeading
          id="story-title"
          eyebrow="De la voix au livre"
          title={
            <>
              Cinq gestes. <em className="text-gradient-ember">Un livre.</em>
            </>
          }
          lead="Chaque animation ci-dessous rejoue l’interface réelle de l’Atelier, avec ses vrais composants."
        />

        <div className="mt-24 hidden grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] gap-16 lg:grid">
          <div data-steps className="relative">
            <div className="absolute top-0 bottom-0 left-[19px] w-px bg-white/10" aria-hidden>
              <div data-progress className="h-full w-full origin-top bg-gradient-to-b from-ember to-iris" />
            </div>
            {STEPS.map((s, i) => (
              <article key={s.n} data-step className="relative flex min-h-[78vh] flex-col justify-center pl-16">
                <span
                  className={cn(
                    'absolute top-1/2 left-0 grid size-10 -translate-y-1/2 place-items-center rounded-full border transition-all duration-500',
                    active === i
                      ? 'border-ember bg-ember text-white shadow-[0_0_30px_rgb(255_106_61/0.5)]'
                      : 'border-white/15 bg-bg text-faint',
                  )}
                >
                  <s.icon className="size-4" />
                </span>
                <p
                  className={cn(
                    'font-mono text-xs tracking-[0.2em] uppercase transition-colors',
                    active === i ? 'text-ember' : 'text-faint',
                  )}
                >
                  {s.n} · {s.tag}
                </p>
                <h3
                  className={cn(
                    'mt-3 font-display text-5xl leading-[1.02] transition-opacity duration-500',
                    active === i ? 'opacity-100' : 'opacity-35',
                  )}
                >
                  {s.title}
                </h3>
                <p
                  className={cn(
                    'mt-4 max-w-md text-[17px] leading-relaxed text-muted transition-opacity duration-500',
                    active === i ? 'opacity-100' : 'opacity-35',
                  )}
                >
                  {s.text}
                </p>
              </article>
            ))}
          </div>
          <div className="relative">
            <div className="sticky top-[14vh] h-[72vh]">
              <BrowserFrame className="h-full" url="atelier-ecrivain.app/atelier">
                <div className="relative h-[calc(72vh-2.25rem)]">
                  {STEPS.map(({ Scene, n }, i) => (
                    <div
                      key={n}
                      className={cn(
                        'absolute inset-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)]',
                        active === i ? 'z-10 opacity-100' : 'pointer-events-none scale-[0.98] opacity-0',
                      )}
                      aria-hidden={active !== i}
                    >
                      <Scene variant="desktop" playing={active === i} />
                    </div>
                  ))}
                </div>
              </BrowserFrame>
            </div>
          </div>
        </div>
        <div className="mt-16 space-y-24 lg:hidden">
          {STEPS.map(({ Scene, ...s }) => (
            <article key={s.n}>
              <p className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-ember uppercase">
                <s.icon className="size-4" /> {s.n} · {s.tag}
              </p>
              <h3 className="mt-3 font-display text-4xl leading-tight">{s.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-muted">{s.text}</p>
              <PhoneFrame className="mx-auto mt-8 w-[min(80vw,320px)]">
                <Scene variant="phone" />
              </PhoneFrame>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
