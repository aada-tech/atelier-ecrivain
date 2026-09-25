'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Cloud, Command, FileUp, Flame, Globe, History, Moon, NotebookPen, Smartphone } from 'lucide-react';
import { ProgressRing } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { SectionHeading } from './reveal';

gsap.registerPlugin(useGSAP, ScrollTrigger);

function Card({
  className,
  icon,
  title,
  children,
  visual,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  visual?: React.ReactNode;
}) {
  return (
    <article
      data-bento
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 transition-colors duration-500 hover:border-white/15',
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-20 -right-20 size-60 rounded-full bg-ember/10 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
      {visual && <div className="relative mb-6 min-h-24 flex-1">{visual}</div>}
      <div className="relative mt-auto">
        <span className="mb-3 inline-grid size-9 place-items-center rounded-xl bg-white/[0.06] text-ember [&>svg]:size-4">{icon}</span>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{children}</p>
      </div>
    </article>
  );
}

export function Bento() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.set('[data-bento]', { visibility: 'visible' });
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('[data-bento]', {
        autoAlpha: 0,
        y: 40,
        duration: 1,
        stagger: 0.07,
        ease: 'expo.out',
        scrollTrigger: { trigger: '[data-bento-grid]', start: 'top 80%', once: true },
      });
      // Notes qui se renumérotent.
      gsap
        .timeline({ repeat: -1, repeatDelay: 1.2, scrollTrigger: { trigger: '[data-notes]', toggleActions: 'play pause resume pause' } })
        .to('[data-note-new]', { width: 'auto', autoAlpha: 1, duration: 0.4, ease: 'back.out(2)' }, 0.8)
        .to('[data-renum="2"]', { yPercent: -100, duration: 0.3 }, 1)
        .to('[data-renum="3"]', { yPercent: -100, duration: 0.3 }, 1.05)
        .to('[data-note-new]', { width: 0, autoAlpha: 0, duration: 0.3 }, 3)
        .to('[data-renum]', { yPercent: 0, duration: 0.3 }, 3.1);
      // Synchronisation hors ligne.
      gsap.to('[data-sync-dot]', { x: 70, autoAlpha: 0, duration: 1.4, stagger: 0.35, repeat: -1, ease: 'power1.in' });
      // Série et objectif.
      gsap.fromTo('[data-flame]', { scale: 0.9 }, { scale: 1.12, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      // Palette : touches.
      gsap
        .timeline({ repeat: -1, repeatDelay: 1 })
        .to('[data-key]', { y: 3, boxShadow: '0 0 0 rgb(0 0 0 / 0)', duration: 0.12, stagger: 0.15, yoyo: true, repeat: 1 });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative py-28 sm:py-36" aria-labelledby="bento-title">
      <div className="container-page">
        <SectionHeading
          id="bento-title"
          eyebrow="Et tout le reste"
          title={
            <>
              Pensé pour écrire <em className="text-gradient-ember">longtemps</em>.
            </>
          }
          lead="Un livre, ce sont des mois de travail. L’Atelier protège chaque mot et chaque minute."
        />
        <div data-bento-grid className="mt-16 grid auto-rows-[minmax(240px,auto)] gap-4 md:grid-cols-6">
          <Card
            className="md:col-span-3"
            icon={<Cloud />}
            title="Hors ligne d’abord"
            visual={
              <div className="flex h-full items-center justify-center gap-4">
                <span className="grid size-14 place-items-center rounded-2xl bg-white/5">
                  <Smartphone className="size-6 text-muted" />
                </span>
                <span className="relative h-2 w-20">
                  {[0, 1, 2].map((i) => (
                    <span key={i} data-sync-dot className="absolute top-0 left-0 size-2 rounded-full bg-ember" />
                  ))}
                </span>
                <span className="grid size-14 place-items-center rounded-2xl bg-white/5">
                  <Cloud className="size-6 text-muted" />
                </span>
              </div>
            }
          >
            Dans le train ou l’avion, chaque frappe est enregistrée sur l’appareil, puis synchronisée dès le retour du réseau.
          </Card>
          <Card
            className="md:col-span-3"
            icon={<NotebookPen />}
            title="Notes de bas de page"
            visual={
              <div data-notes className="flex h-full items-center font-serif text-[22px] leading-relaxed text-text/85">
                <p>
                  Le phare de Cordouan
                  <sup className="inline-block h-[1.1em] overflow-hidden align-super font-sans text-[0.55em] font-semibold text-ember">
                    <span className="block">1</span>
                  </sup>
                  , que Marthe
                  <sup
                    data-note-new
                    className="inline-block w-0 overflow-hidden align-super font-sans text-[0.55em] font-semibold text-iris opacity-0"
                  >
                    2
                  </sup>{' '}
                  visitait
                  <sup className="inline-block h-[1.1em] overflow-hidden align-super font-sans text-[0.55em] font-semibold text-ember">
                    <span data-renum="2" className="block">
                      2<br />3
                    </span>
                  </sup>{' '}
                  enfant
                  <sup className="inline-block h-[1.1em] overflow-hidden align-super font-sans text-[0.55em] font-semibold text-ember">
                    <span data-renum="3" className="block">
                      3<br />4
                    </span>
                  </sup>
                  .
                </p>
              </div>
            }
          >
            Insérez une note où vous voulez : la numérotation se refait seule, jusque dans le PDF et l’EPUB.
          </Card>
          <Card
            className="md:col-span-2"
            icon={<Flame />}
            title="Objectifs & séries"
            visual={
              <div className="flex h-full items-center justify-center gap-5">
                <ProgressRing value={0.78} size={76} stroke={6}>
                  <span className="text-sm font-semibold">390</span>
                </ProgressRing>
                <span data-flame className="flex items-center gap-1 text-3xl font-semibold text-ember">
                  <Flame className="size-7 fill-ember/30" /> 12
                </span>
              </div>
            }
          >
            Un objectif quotidien, une série de jours qui s’allonge. La régularité fait les livres.
          </Card>
          <Card
            className="md:col-span-2"
            icon={<History />}
            title="Versions & corbeille"
            visual={
              <div className="flex h-full items-center">
                <div className="relative w-full">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                  <div className="relative flex justify-between">
                    {['Premier jet', 'Relu', 'Avant réécriture', 'Aujourd’hui'].map((l, i) => (
                      <span key={l} className="flex flex-col items-center gap-2">
                        <span className={cn('size-3 rounded-full ring-4 ring-bg', i === 3 ? 'bg-ember' : 'bg-white/30')} />
                        <span className="w-16 text-center text-[10px] leading-tight text-faint">{l}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            }
          >
            Figez un état, comparez, restaurez. Un chapitre supprimé ou modifié ailleurs n’est jamais perdu.
          </Card>
          <Card
            className="md:col-span-2"
            icon={<Command />}
            title="Tout au clavier"
            visual={
              <div className="flex h-full items-center justify-center gap-2">
                {['⌘', 'K'].map((k) => (
                  <span
                    key={k}
                    data-key
                    className="grid size-14 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-xl font-medium shadow-[0_4px_0_rgb(255_255_255/0.08)]"
                  >
                    {k}
                  </span>
                ))}
              </div>
            }
          >
            Palette de commandes, recherche plein texte dans tout le manuscrit, dictée sur ⌥D.
          </Card>
          <Card className="md:col-span-2" icon={<Globe />} title="Recherche documentaire">
            Un dossier sourcé sur une époque, un lieu, un métier — rangé dans vos pense-bêtes, liens compris.
          </Card>
          <Card className="md:col-span-2" icon={<FileUp />} title="Importez l’existant">
            Un manuscrit en .txt ou .md est découpé automatiquement en chapitres. Vos titres, italiques et gras sont conservés.
          </Card>
          <Card className="md:col-span-2" icon={<Moon />} title="Jour, sépia, nuit">
            Trois ambiances de lecture et d’écriture, sur tous vos appareils. Le mode nuit ménage vos yeux à 2 h du matin.
          </Card>
        </div>
      </div>
    </section>
  );
}
