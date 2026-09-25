'use client';

import { Fragment, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight, Play, ShieldCheck, WifiOff, FileDown, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrowserFrame, PhoneFrame } from './device';
import { DictationScene } from './scenes/dictation-scene';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const TITLE: { t: string; em?: boolean }[][] = [[{ t: 'Parlez.' }], [{ t: 'Votre' }, { t: 'livre' }, { t: 's’écrit.', em: true }]];

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // L'intro du texte est en CSS (rendu serveur, sans attendre l'hydratation) ;
      // GSAP prend le relais pour l'ambiance, l'appareil et le défilement.

      // Orbes d'ambiance en dérive lente.
      gsap.to('[data-orb="a"]', { x: 120, y: 60, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to('[data-orb="b"]', { x: -100, y: -40, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 });

      // L'appareil se redresse au défilement.
      gsap.fromTo(
        '[data-hero-tilt]',
        { rotateX: 16, scale: 0.94 },
        {
          rotateX: 0,
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: '[data-hero-tilt]', start: 'top 85%', end: 'top 25%', scrub: 0.6 },
        },
      );

      // Parallaxe à la souris (pointeur fin uniquement).
      if (window.matchMedia('(pointer: fine)').matches) {
        const tilt = document.querySelector<HTMLElement>('[data-hero-parallax]');
        const qx = gsap.quickTo(tilt, 'rotateY', { duration: 0.8, ease: 'power3' });
        const qy = gsap.quickTo(tilt, 'rotateX', { duration: 0.8, ease: 'power3' });
        const onMove = (e: PointerEvent) => {
          qx((e.clientX / window.innerWidth - 0.5) * 6);
          qy((e.clientY / window.innerHeight - 0.5) * -4);
        };
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
      }
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden pt-32 pb-24 sm:pt-40" aria-labelledby="hero-title">
      {/* Ambiance */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          data-orb="a"
          className="absolute -top-20 -left-40 size-[620px] rounded-full bg-[radial-gradient(circle,rgb(255_106_61/0.35),transparent_65%)] blur-2xl"
        />
        <div
          data-orb="b"
          className="absolute top-40 -right-40 size-[680px] rounded-full bg-[radial-gradient(circle,rgb(141_128_255/0.3),transparent_65%)] blur-2xl"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_50%_0%,black_20%,transparent_70%)] bg-[size:72px_72px]" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="relative container-page text-center">
        <p className="hero-in mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] text-muted backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-ember" />
          </span>
          Dictée en direct · IA éditoriale · Livre prêt à imprimer
        </p>

        <h1
          id="hero-title"
          aria-label="Parlez. Votre livre s’écrit."
          className="mx-auto mt-7 max-w-5xl font-display text-[clamp(3.4rem,11vw,9.5rem)] leading-[0.9] font-normal tracking-[-0.035em]"
        >
          {TITLE.map((line, li) => (
            <span key={li} aria-hidden className="block overflow-hidden pb-[0.1em]">
              {line.map((w, wi) => (
                <Fragment key={wi}>
                  <span
                    className={w.em ? 'hero-word text-gradient-ember pr-[0.06em] italic' : 'hero-word'}
                    style={{ animationDelay: `${0.08 + (li * 2 + wi) * 0.09}s` }}
                  >
                    {w.t}
                  </span>
                  {wi < line.length - 1 ? ' ' : null}
                </Fragment>
              ))}
            </span>
          ))}
        </h1>

        <div aria-hidden className="hero-in mx-auto mt-6 flex h-8 w-fit items-center gap-[4px] text-ember">
          {[0.3, 0.55, 0.8, 0.5, 1, 0.65, 0.4, 0.9, 0.6, 0.35, 0.7, 1, 0.5, 0.8, 0.45, 0.3].map((h, i) => (
            <span
              key={i}
              className="w-[3px] origin-center animate-[hero-wave_1.4s_ease-in-out_infinite] rounded-full bg-current"
              style={{ height: `${h * 100}%`, animationDelay: `${(i % 6) * -0.18}s` }}
            />
          ))}
        </div>

        <p className="hero-in mx-auto mt-6 max-w-2xl text-[clamp(1.05rem,2.2vw,1.3rem)] leading-relaxed text-balance text-muted">
          L’atelier d’écriture qui transforme votre voix en manuscrit. Dictez, laissez l’IA raturer et vérifier vos faits, puis tenez votre
          livre — PDF prêt à imprimer, EPUB prêt à lire.
        </p>

        <div className="hero-in mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-13 px-7 text-base">
            <Link href="/connexion">
              Commencer gratuitement <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-13 px-6 text-base text-text hover:bg-white/5">
            <a href="#reels">
              <Play className="size-4 fill-current" /> Voir en 30 secondes
            </a>
          </Button>
        </div>

        <ul className="hero-in mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-faint">
          <li className="flex items-center gap-1.5">
            <Mic className="size-3.5" /> Sans carte bancaire
          </li>
          <li className="flex items-center gap-1.5">
            <WifiOff className="size-3.5" /> Fonctionne hors ligne
          </li>
          <li className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Conforme RGPD
          </li>
          <li className="flex items-center gap-1.5">
            <FileDown className="size-3.5" /> PDF · EPUB · Markdown
          </li>
        </ul>
      </div>

      {/* Démonstration réelle */}
      <div className="hero-in hero-device relative container-page mt-16 [perspective:1600px] sm:mt-20">
        <div data-hero-tilt className="mx-auto max-w-5xl [transform-origin:50%_0%]">
          <div data-hero-parallax className="[transform-style:preserve-3d]">
            <div
              className="absolute -inset-x-10 top-10 -bottom-10 -z-10 rounded-[3rem] bg-[radial-gradient(ellipse_at_center,rgb(255_106_61/0.25),transparent_70%)] blur-2xl"
              aria-hidden
            />
            <BrowserFrame className="hidden sm:block">
              <div className="h-[min(62vw,600px)]">
                <DictationScene variant="desktop" />
              </div>
            </BrowserFrame>
            <PhoneFrame className="mx-auto w-[min(78vw,320px)] sm:hidden">
              <DictationScene variant="phone" />
            </PhoneFrame>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-faint">
          Démonstration animée de l’interface réelle : dictée en direct avec commandes vocales.
        </p>
      </div>
    </section>
  );
}
