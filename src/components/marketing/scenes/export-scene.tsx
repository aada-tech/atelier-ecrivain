'use client';

import { BookOpenText, Check, FileDown, Sparkles } from 'lucide-react';
import { BookCover } from '@/components/manuscript/book-cover';
import { DemoCursor, moveAndClick, useScene, type SceneProps } from './use-scene';
import { cn } from '@/lib/utils';

const THEMES = ['Roman classique', 'Édition prestige', 'Minimaliste'];

export function ExportScene({ variant = 'desktop', playing, className, onLoop }: SceneProps) {
  const phone = variant === 'phone';
  const scope = useScene(
    (tl, q, root) => {
      tl.set(q('[data-cover-bg]'), { clipPath: 'inset(100% 0 0 0)' })
        .set(q('[data-cover-text] > *'), { autoAlpha: 0, y: 14 })
        .set(q('[data-book]'), { rotateY: 0, x: 0 })
        .set(q('[data-page]'), { x: 0, rotateY: 0, autoAlpha: 0 })
        .set(q('[data-theme-chip]'), { autoAlpha: 0.45 })
        .set(q('[data-bar]'), { scaleX: 0 })
        .set(q('[data-result]'), { autoAlpha: 0, y: 10 })
        .set(q('[data-progress]'), { autoAlpha: 0 })
        .set(q('[data-cursor]'), { autoAlpha: 0, x: 40, y: 260 });

      // Choix du style éditorial.
      q('[data-theme-chip]').forEach((el, i) => {
        tl.to(el, { autoAlpha: 1, borderColor: 'var(--c-ember)', duration: 0.25 }, 0.3 + i * 0.35);
        if (i < 2) tl.to(el, { autoAlpha: 0.45, borderColor: 'var(--c-border)', duration: 0.25 }, 0.6 + i * 0.35);
      });
      // La couverture se compose.
      tl.to(q('[data-cover-bg]'), { clipPath: 'inset(0% 0 0 0)', duration: 0.9, ease: 'power3.inOut' }, 1.2);
      tl.to(q('[data-cover-text] > *'), { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.15 }, '-=0.3');
      tl.to(q('[data-book]'), { rotateY: -24, x: phone ? -24 : -44, duration: 0.9, ease: 'power2.inOut' }, '+=0.2');
      tl.to(
        q('[data-page]'),
        {
          autoAlpha: 1,
          x: (i) => (phone ? 26 : 44) + i * (phone ? 22 : 34),
          rotateY: (i) => -10 + i * 6,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out',
        },
        '<0.2',
      );
      tl.addLabel('still');
      moveAndClick(tl, root, '[data-cursor]', '[data-generate]', '+=0.1');
      tl.to(q('[data-progress]'), { autoAlpha: 1, duration: 0.2 });
      tl.to(q('[data-bar]'), { scaleX: 1, duration: 1.4, ease: 'power1.inOut' });
      tl.to(q('[data-progress]'), { autoAlpha: 0, duration: 0.2 });
      tl.to(q('[data-result]'), { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.12, ease: 'back.out(2)' }, '<');
      tl.to(q('[data-cursor]'), { autoAlpha: 0, duration: 0.3 }, '<');
      tl.to({}, { duration: 2 });
    },
    { playing, onLoop },
  );

  return (
    <div ref={scope} data-theme="light" className={cn('relative h-full w-full overflow-hidden bg-bg text-text', className)}>
      <div
        data-scene
        className={cn('relative grid h-full', phone ? 'grid-rows-[auto_1fr_auto] gap-3 p-5' : 'grid-cols-[230px_1fr] gap-6 p-7')}
      >
        <div className={cn('space-y-4', phone && 'order-3')}>
          {!phone && (
            <div>
              <p className="font-display text-2xl">Exporter le livre</p>
              <p className="text-[11px] text-muted">12 chapitres · 48 210 mots</p>
            </div>
          )}
          {!phone && (
            <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-[11px] font-medium">
              <span className="flex flex-1 items-center justify-center gap-1 rounded-md bg-surface py-1.5 shadow-soft">
                <BookOpenText className="size-3" /> PDF
              </span>
              <span className="flex flex-1 items-center justify-center gap-1 py-1.5 text-muted">
                <Sparkles className="size-3" /> EPUB
              </span>
            </div>
          )}
          <div className={cn('grid gap-1.5', phone && 'grid-cols-3')}>
            {THEMES.map((t) => (
              <span
                key={t}
                data-theme-chip
                className={cn('rounded-lg border border-border px-2.5 text-[11px] font-medium', phone ? 'py-1.5' : 'py-2')}
              >
                <span className="font-serif text-[13px] text-ember">Aa ❦</span>
                <span className="block truncate text-muted">{t}</span>
              </span>
            ))}
          </div>
          {!phone && (
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
              {['A5 · roman', '6×9 po · KDP', 'Sommaire', 'Notes'].map((l) => (
                <span key={l} className="rounded-md border border-border px-2 py-1.5 text-muted">
                  {l}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            data-generate
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ember text-[12.5px] font-semibold text-white"
            tabIndex={-1}
          >
            <FileDown className="size-4" /> Générer le PDF
          </button>
          <div data-progress className="space-y-1.5">
            <p className="text-[10.5px] text-muted">Mise en page… 212 pages</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div data-bar className="h-full origin-left rounded-full bg-ember" />
            </div>
          </div>
        </div>

        <div className="relative grid place-items-center [perspective:1100px]">
          <div className="relative" style={{ width: phone ? 150 : 190 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                data-page
                className="absolute inset-0 [transform-origin:left_center] rounded-[3px] border border-border bg-paper p-[9%] shadow-lift"
                style={{ zIndex: 3 - i }}
              >
                {i === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <p className="text-[7px] tracking-[0.25em] text-ember uppercase">Chapitre 1</p>
                    <p className="mt-1 font-serif text-[12px]">La maison des falaises</p>
                    <p className="mt-2 text-[9px] text-ember">❦</p>
                  </div>
                ) : (
                  <div className="space-y-[5px] pt-[14%]">
                    {Array.from({ length: 13 }, (_, k) => (
                      <div key={k} className="h-[3px] rounded-full bg-text/15" style={{ width: `${k % 5 === 4 ? 60 : 100}%` }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div data-book className="relative z-10 [transform-origin:left_center] [transform-style:preserve-3d]">
              <div className="relative overflow-hidden rounded-[3px_8px_8px_3px] bg-surface-3 shadow-pop">
                <div data-cover-bg>
                  <BookCover title="" hideText background="linear-gradient(160deg, #1d1b2b 0%, #3b2a4a 55%, #f2542d 140%)" />
                </div>
                <div
                  data-cover-text
                  className="absolute inset-0 flex flex-col items-center justify-between px-[9%] pt-[18%] pb-[10%] text-center text-white"
                >
                  <div>
                    <p className="font-display text-[26px] leading-none">Le Phare</p>
                    <p className="mt-2 font-serif text-[9.5px] italic opacity-85">roman</p>
                  </div>
                  <p className="text-[8.5px] font-medium tracking-[0.2em] uppercase">Camille Morel</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn('flex flex-wrap items-center justify-center gap-2', phone ? 'order-2' : 'absolute right-7 bottom-6')}>
          <span data-result className="flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1.5 text-[11px] font-medium text-sage">
            <Check className="size-3.5" /> le-phare.pdf · 212 p.
          </span>
          <span data-result className="flex items-center gap-1.5 rounded-full bg-iris-soft px-3 py-1.5 text-[11px] font-medium text-iris">
            <Check className="size-3.5" /> le-phare.epub
          </span>
        </div>
      </div>
      <DemoCursor />
    </div>
  );
}
