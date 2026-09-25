'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#reels', label: 'En vidéo' },
  { href: '/#confidentialite', label: 'Confidentialité' },
  { href: '/#faq', label: 'FAQ' },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
      <nav
        aria-label="Navigation principale"
        className={cn(
          'flex h-14 w-full max-w-5xl items-center gap-2 rounded-2xl border px-3 transition-all duration-500 sm:px-4',
          scrolled ? 'border-white/10 bg-[#0b0b10]/70 shadow-[0_10px_40px_-12px_rgb(0_0_0/0.6)] backdrop-blur-xl' : 'border-transparent',
        )}
      >
        <Link href="/" aria-label="Atelier — accueil" className="mr-4">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-lg px-3 py-2 text-sm text-muted transition hover:text-text">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/connexion" className="hidden rounded-lg px-3 py-2 text-sm text-muted transition hover:text-text sm:block">
            Se connecter
          </Link>
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/connexion">Commencer</Link>
          </Button>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg text-muted md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="absolute inset-x-3 top-[4.5rem] rounded-2xl border border-white/10 bg-[#0b0b10]/95 p-2 backdrop-blur-xl md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-base text-muted hover:bg-white/5 hover:text-text"
            >
              {l.label}
            </a>
          ))}
          <Link href="/connexion" className="block rounded-xl px-4 py-3 text-base text-muted hover:bg-white/5">
            Se connecter
          </Link>
        </div>
      )}
    </header>
  );
}
