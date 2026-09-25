import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.08] py-14">
      <div className="container-page flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-faint">
            {SITE.fullName}. L’atelier d’écriture qui transforme votre voix en manuscrit.
          </p>
        </div>
        <nav aria-label="Pied de page" className="grid grid-cols-2 gap-x-14 gap-y-3 text-sm sm:grid-cols-3">
          <Link href="/connexion" className="text-muted hover:text-text">
            Se connecter
          </Link>
          <Link href="/#fonctionnalites" className="text-muted hover:text-text">
            Fonctionnalités
          </Link>
          <Link href="/reels" className="text-muted hover:text-text">
            Studio vidéo
          </Link>
          <Link href="/confidentialite" className="text-muted hover:text-text">
            Confidentialité
          </Link>
          <Link href="/mentions-legales" className="text-muted hover:text-text">
            Mentions légales
          </Link>
          <Link href="/conditions" className="text-muted hover:text-text">
            Conditions d’utilisation
          </Link>
        </nav>
      </div>
      <div className="container-page mt-12 flex flex-col justify-between gap-2 text-xs text-faint sm:flex-row">
        <p>
          © {new Date().getFullYear()} {SITE.name}. Tous droits réservés.
        </p>
        <p>Aucun cookie publicitaire · Polices auto-hébergées</p>
      </div>
    </footer>
  );
}
