'use client';

import { useCallback, useRef, type ComponentType } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { LogoMark } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import type { SceneProps } from './scenes/use-scene';
import { ScaledStage } from './scaled-stage';
import { DictationScene } from './scenes/dictation-scene';
import { RatureScene } from './scenes/rature-scene';
import { FactScene } from './scenes/fact-scene';
import { ExportScene } from './scenes/export-scene';
import { ReaderScene } from './scenes/reader-scene';

gsap.registerPlugin(useGSAP);

type SceneComponent = ComponentType<SceneProps>;

export interface ReelConfig {
  id: string;
  label: string;
  Scene: SceneComponent;
  /** Sous-titres : chaque ligne s'affiche mot à mot ; *mot* = mot surligné. */
  captions: string[];
  accent: string;
}

export const REELS: ReelConfig[] = [
  {
    id: 'dictee',
    label: 'Dicter',
    Scene: DictationScene,
    captions: ['Je dicte mon *roman*', 'dans le métro 🚇', 'et la *ponctuation* suit.'],
    accent: '#ff6a3d',
  },
  {
    id: 'ratures',
    label: 'Raturer',
    Scene: RatureScene,
    captions: ['L’IA *rature*…', 'mais c’est *moi*', 'qui décide ✍️'],
    accent: '#8d80ff',
  },
  {
    id: 'faits',
    label: 'Vérifier',
    Scene: FactScene,
    captions: ['*1887* ou 1889 ?', 'Vérifié en *3 secondes*', 'sources à l’appui 🔎'],
    accent: '#3ecf8e',
  },
  {
    id: 'livre',
    label: 'Composer',
    Scene: ExportScene,
    captions: ['De ma *voix*…', '…à mon *livre* imprimé', 'PDF + EPUB 📚'],
    accent: '#f2b33d',
  },
  {
    id: 'liseuse',
    label: 'Relire',
    Scene: ReaderScene,
    captions: ['Relire la *nuit*', 'comme un *vrai livre* 🌙', 'même hors ligne.'],
    accent: '#8d80ff',
  },
];

function renderCaption(line: string, accent: string) {
  return line.split(' ').map((word, i) => {
    const hl = /^\*.*\*[.,!?…]*$/.test(word);
    const clean = word.replace(/\*/g, '');
    return (
      <span key={i} data-word className="mr-[0.26em] inline-block">
        <span
          className={cn('inline-block rounded-[0.18em] px-[0.12em]', hl && 'text-[#0b0b10]')}
          style={hl ? { background: accent } : undefined}
        >
          {clean}
        </span>
      </span>
    );
  });
}

/**
 * Vidéo verticale 9:16 (format TikTok / Reels / Shorts) : scène réelle de
 * l'Atelier + sous-titres cinétiques. `capture` retire toute décoration.
 */
export function Reel({
  reel,
  className,
  capture,
  playing,
}: {
  reel: ReelConfig;
  className?: string;
  capture?: boolean;
  playing?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { Scene } = reel;

  const captionTl = useRef<gsap.core.Timeline | null>(null);
  useGSAP(
    () => {
      const lines = gsap.utils.toArray<HTMLElement>('[data-caption]');
      gsap.set(lines, { autoAlpha: 0 });
      gsap.set(lines[0], { autoAlpha: 1 });
      return () => captionTl.current?.kill();
    },
    { scope: root },
  );

  /** Les sous-titres sont calés sur le cycle réel de la scène : même durée, même départ. */
  const onLoop = useCallback((duration: number) => {
    const el = root.current;
    if (!el) return;
    const lines = gsap.utils.toArray<HTMLElement>('[data-caption]', el);
    const slot = duration / lines.length;
    if (!captionTl.current || Math.abs(captionTl.current.duration() - duration) > 0.05) {
      captionTl.current?.kill();
      const tl = gsap.timeline({ paused: true });
      tl.set(lines, { autoAlpha: 0 }, 0);
      lines.forEach((line, i) => {
        const words = line.querySelectorAll('[data-word]');
        tl.set(line, { autoAlpha: 1, y: 0 }, i * slot)
          .fromTo(
            words,
            { yPercent: 80, scale: 0.7, autoAlpha: 0 },
            { yPercent: 0, scale: 1, autoAlpha: 1, duration: 0.35, stagger: 0.11, ease: 'back.out(2.4)' },
            i * slot,
          )
          .to(line, { autoAlpha: 0, y: -10, duration: 0.25 }, (i + 1) * slot - 0.3);
      });
      tl.fromTo(el.querySelectorAll('[data-seg]'), { scaleX: 0 }, { scaleX: 1, duration: slot, ease: 'none', stagger: slot }, 0);
      tl.set({}, {}, duration);
      captionTl.current = tl;
    }
    captionTl.current.restart();
  }, []);

  return (
    <ScaledStage
      width={360}
      height={640}
      className={cn(
        'bg-[#0b0b10]',
        !capture && 'rounded-[1.6rem] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] ring-1 ring-white/10',
        className,
      )}
    >
      <div ref={root} className="[container-type:inline-size] relative size-full overflow-hidden bg-[#0b0b10] text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--reel-accent),transparent_55%)] opacity-40"
          style={{ ['--reel-accent' as string]: reel.accent }}
        />
        {/* Scène réelle */}
        <div className="absolute inset-x-[5%] top-[26%] bottom-[12%] overflow-hidden rounded-[6cqi] shadow-[0_20px_60px_-10px_rgb(0_0_0/0.7)] ring-1 ring-white/10">
          <Scene variant="phone" playing={playing} onLoop={onLoop} />
        </div>

        {/* Progression façon « stories » */}
        <div className="absolute inset-x-[5%] top-[3.2%] flex gap-[1.2cqi]">
          {reel.captions.map((_, i) => (
            <span key={i} className="h-[0.8cqi] flex-1 overflow-hidden rounded-full bg-white/25">
              <span data-seg className="block h-full origin-left bg-white" />
            </span>
          ))}
        </div>

        {/* Sous-titres cinétiques */}
        <div className="absolute inset-x-[6%] top-[7.5%] grid h-[17%] place-items-center text-center [&>*]:[grid-area:1/1]">
          {reel.captions.map((line, i) => (
            <p
              key={i}
              data-caption
              className="text-[8.6cqi] leading-[1.05] font-extrabold tracking-[-0.02em] [text-shadow:0_2px_12px_rgb(0_0_0/0.5)]"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              {renderCaption(line, reel.accent)}
            </p>
          ))}
        </div>

        {/* Signature */}
        <div className="absolute inset-x-[6%] bottom-[3.5%] flex items-center gap-[2.4cqi]">
          <LogoMark className="size-[9cqi]" />
          <div className="leading-tight">
            <p className="text-[4.2cqi] font-semibold">L’Atelier de l’Écrivain</p>
            <p className="text-[3.4cqi] text-white/60">Parlez. Votre livre s’écrit.</p>
          </div>
          <span className="ml-auto rounded-full bg-white px-[3.2cqi] py-[1.6cqi] text-[3.4cqi] font-semibold text-[#0b0b10]">Essayer</span>
        </div>
      </div>
    </ScaledStage>
  );
}
