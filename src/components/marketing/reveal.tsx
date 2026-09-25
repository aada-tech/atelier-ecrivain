'use client';

import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/** Titre de section révélé ligne à ligne au défilement (SplitText + masque). */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'center',
  className,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      gsap.set(el, { visibility: 'visible' });
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const split = SplitText.create(el.querySelector('h2'), { type: 'lines', mask: 'lines', aria: 'auto' });
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: 'top 82%', once: true } })
        .from(el.querySelector('[data-eyebrow]'), { autoAlpha: 0, y: 12, duration: 0.6, ease: 'power3.out' })
        .from(split.lines, { yPercent: 110, duration: 1, stagger: 0.09, ease: 'expo.out' }, 0.05)
        .from(el.querySelector('[data-lead]'), { autoAlpha: 0, y: 16, duration: 0.8, ease: 'power3.out' }, 0.3);
      return () => split.revert();
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={cn('gsap-hide', align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl', className)}>
      {eyebrow && (
        <p data-eyebrow className="mb-4 font-mono text-xs tracking-[0.22em] text-ember uppercase">
          {eyebrow}
        </p>
      )}
      <h2 id={id} className="font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.98] tracking-[-0.025em]">
        {title}
      </h2>
      {lead && (
        <p data-lead className="mt-5 text-lg leading-relaxed text-pretty text-muted">
          {lead}
        </p>
      )}
    </div>
  );
}

/** Apparition douce d'un bloc au défilement. */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      gsap.set(el, { visibility: 'visible' });
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from(el, {
        autoAlpha: 0,
        y,
        duration: 1,
        delay,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={cn('gsap-hide', className)}>
      {children}
    </div>
  );
}
