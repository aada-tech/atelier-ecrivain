import Link from 'next/link';
import { LogoMark } from '@/components/ui/logo';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <LogoMark className="mx-auto size-12" />
        <p className="mt-8 font-mono text-xs tracking-[0.25em] text-ember uppercase">Erreur 404</p>
        <h1 className="mt-3 font-display text-5xl">Page raturée.</h1>
        <p className="mt-3 text-muted">Cette page n’existe pas, ou plus.</p>
        <Link href="/" className="mt-8 inline-block rounded-xl bg-ember px-5 py-2.5 text-sm font-semibold text-white">
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
