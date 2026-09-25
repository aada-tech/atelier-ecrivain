'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Maximize2, Terminal } from 'lucide-react';
import { Reel, REELS } from './reel';
import { cn } from '@/lib/utils';

/**
 * Studio de reels : aperçu plein écran des vidéos 9:16 et mode capture
 * (?capture=1&reel=…) utilisé par `npm run reels:record` pour produire
 * des vidéos 1080×1920 prêtes pour TikTok, Instagram Reels et YouTube Shorts.
 */
export function ReelsStudio() {
  const params = useSearchParams();
  const capture = params.get('capture') === '1';
  const initial = REELS.findIndex((r) => r.id === params.get('reel'));
  const [index, setIndex] = useState(initial >= 0 ? initial : 0);
  const reel = REELS[index];

  if (capture) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#0b0b10]" data-capture-ready>
        <div style={{ width: 'min(100vw, calc(100vh * 9 / 16))' }}>
          <Reel reel={reel} capture />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" /> Accueil
        </Link>
        <h1 className="font-display text-2xl">Studio vidéo</h1>
      </header>
      <main className="container-page grid gap-10 pt-6 pb-20 lg:grid-cols-[1fr_380px]">
        <div className="flex justify-center">
          <div style={{ width: 'min(100%, calc((100dvh - 8rem) * 9 / 16))' }}>
            <Reel key={reel.id} reel={reel} />
          </div>
        </div>
        <aside className="space-y-6">
          <div className="grid grid-cols-2 gap-2">
            {REELS.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                className={cn(
                  'rounded-xl border border-white/10 px-4 py-3 text-left text-sm transition hover:border-white/25',
                  i === index && 'border-ember bg-ember/10',
                )}
              >
                <span className="block font-medium">{r.label}</span>
                <span className="block truncate text-xs text-faint">{r.captions[0].replace(/\*/g, '')}</span>
              </button>
            ))}
          </div>
          <Link
            href={`/reels?capture=1&reel=${reel.id}`}
            target="_blank"
            className="flex items-center justify-center gap-2 rounded-xl bg-ember px-4 py-3 text-sm font-semibold text-white"
          >
            <Maximize2 className="size-4" /> Ouvrir en mode capture
          </Link>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted">
            <p className="flex items-center gap-2 font-medium text-text">
              <Terminal className="size-4" /> Exporter en vidéo
            </p>
            <p className="mt-2">
              Le mode capture affiche la vidéo seule, au format 9:16. Pour générer automatiquement des fichiers 1080×1920 de chaque reel :
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-xs text-text">
              npm run build && npm start{'\n'}npm run reels:record
            </pre>
            <p className="mt-2 text-xs text-faint">Les vidéos sont écrites dans le dossier reels-output/.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
