'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/bibliotheque', label: 'Bibliothèque' },
  { href: '/compte', label: 'Compte' },
];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-6">
        <Link href="/bibliotheque" aria-label="Atelier — bibliothèque">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Navigation principale">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? 'page' : undefined}
              className={cn('rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-text', pathname === l.href && 'bg-surface-2 text-text')}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
