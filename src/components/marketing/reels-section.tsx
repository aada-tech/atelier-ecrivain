'use client';

import Link from 'next/link';
import { Clapperboard } from 'lucide-react';
import { SectionHeading } from './reveal';
import { Reel, REELS } from './reel';

export function ReelsSection() {
  return (
    <section id="reels" className="relative py-28 sm:py-36" aria-labelledby="reels-title">
      <div className="container-page">
        <SectionHeading
          id="reels-title"
          eyebrow="En 30 secondes"
          title={
            <>
              Vu en format <em className="text-gradient-iris">vertical</em>.
            </>
          }
          lead="Des démonstrations 9:16 prêtes pour TikTok, Reels et Shorts — générées à partir de l’interface réelle."
        />
      </div>
      <div className="mt-16 flex snap-x snap-mandatory scrollbar-thin gap-5 overflow-x-auto px-[max(16px,calc((100vw-1200px)/2+32px))] pb-6">
        {REELS.map((r) => (
          <div key={r.id} className="w-[min(72vw,280px)] shrink-0 snap-center">
            <Reel reel={r} />
            <p className="mt-3 text-center text-sm text-muted">{r.label}</p>
          </div>
        ))}
      </div>
      <div className="container-page mt-8 text-center">
        <Link
          href="/reels"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-muted transition hover:border-white/25 hover:text-text"
        >
          <Clapperboard className="size-4" /> Ouvrir le studio vidéo (plein écran, capture 1080×1920)
        </Link>
      </div>
    </section>
  );
}
