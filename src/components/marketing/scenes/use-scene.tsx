'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export interface SceneProps {
  variant?: 'desktop' | 'phone';
  playing?: boolean;
  className?: string;
  onLoop?: (duration: number) => void;
}

export type SceneBuilder = (tl: gsap.core.Timeline, q: (selector: string) => Element[], root: HTMLElement) => void;

/**
 * Timeline GSAP d'une scène de démonstration :
 * - joue en boucle quand la scène est visible, se met en pause hors écran ;
 * - `playing` (optionnel) permet de la piloter (scroll storytelling) ;
 * - en « mouvement réduit », la scène est figée sur son image clé « still ».
 */
export function useScene(
  build: SceneBuilder,
  opts: { playing?: boolean; loop?: boolean; repeatDelay?: number; onLoop?: (duration: number) => void } = {},
): RefObject<HTMLDivElement | null> {
  const scope = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const visible = useRef(false);
  const { playing, loop = true, repeatDelay = 0.8 } = opts;
  const onLoopRef = useRef(opts.onLoop);
  useEffect(() => {
    onLoopRef.current = opts.onLoop;
  });
  const playingRef = useRef(playing);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const tl = gsap.timeline({ paused: true, repeat: loop ? -1 : 0, repeatDelay, defaults: { ease: 'power3.out' } });
      build(tl, gsap.utils.selector(root), root);
      // Notifie chaque début de cycle (synchronisation des sous-titres des reels).
      const notify = () => onLoopRef.current?.(tl.duration() + repeatDelay);
      tl.eventCallback('onStart', notify).eventCallback('onRepeat', notify);
      tlRef.current = tl;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        tl.seek(tl.labels.still ?? tl.duration()).pause();
        return;
      }
      // Affiche l'état initial dès le montage.
      tl.progress(0).pause();
      const io = new IntersectionObserver(
        ([entry]) => {
          visible.current = entry.isIntersecting;
          if (entry.isIntersecting && playingRef.current !== false) tl.play();
          else tl.pause();
        },
        { threshold: 0.2 },
      );
      io.observe(root);
      return () => io.disconnect();
    },
    { scope, dependencies: [] },
  );

  useGSAP(
    () => {
      playingRef.current = playing;
      const tl = tlRef.current;
      if (!tl || playing === undefined || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (playing && visible.current) tl.restart();
      else if (playing) tl.progress(0).pause();
      else tl.pause();
    },
    { dependencies: [playing] },
  );

  return scope;
}

/** Curseur de démonstration (flèche) déplacé par la timeline. */
export function DemoCursor({ className }: { className?: string }) {
  return (
    <svg
      data-cursor
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden
      style={{ position: 'absolute', left: 0, top: 0, zIndex: 40, opacity: 0, filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / .35))' }}
    >
      <path d="M5 3l14 7.2-6.2 1.6L10 18z" fill="#fff" stroke="#17151f" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Position (px, repère local non transformé) du centre d'un élément dans la scène. */
export function localPoint(root: HTMLElement, el: Element | undefined, dx = 0, dy = 0) {
  if (!el) return { x: 0, y: 0 };
  const r = root.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  const scale = r.width / (root.offsetWidth || r.width || 1);
  return { x: (e.left - r.left + e.width / 2) / scale + dx, y: (e.top - r.top + e.height / 2) / scale + dy };
}

/**
 * Ajoute à la timeline un déplacement du curseur vers un élément de la scène,
 * puis un clic. Les positions sont calculées au moment du déplacement, dans
 * le repère du conteneur du curseur (compatible avec une scène mise à l'échelle).
 */
export function moveAndClick(tl: gsap.core.Timeline, root: HTMLElement, cursor: string, target: string, at?: gsap.Position, click = true) {
  const pick = (axis: 'x' | 'y') => () => {
    const cursorEl = root.querySelector<HTMLElement>(cursor);
    const origin = (cursorEl?.offsetParent as HTMLElement | null) ?? root;
    return localPoint(origin, root.querySelector(target) ?? undefined, 4, 6)[axis];
  };
  tl.to(cursor, { autoAlpha: 1, x: pick('x'), y: pick('y'), duration: 0.7, ease: 'power2.inOut' }, at);
  if (click) tl.to(cursor, { scale: 0.8, duration: 0.09, ease: 'power1.in' }).to(cursor, { scale: 1, duration: 0.16 });
}
