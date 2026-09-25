import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from './reveal';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-32 sm:py-44" aria-labelledby="cta-title">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgb(255_106_61/0.28),transparent_65%)] blur-2xl" />
        <div className="grain absolute inset-0" />
      </div>
      <div className="relative container-page text-center">
        <SectionHeading
          id="cta-title"
          title={
            <>
              Votre prochain chapitre
              <br />
              commence <em className="text-gradient-ember">à voix haute</em>.
            </>
          }
          lead="Créez votre atelier en dix secondes. Sans carte bancaire, sans installation."
        />
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-13 px-8 text-base">
            <Link href="/connexion">
              Commencer gratuitement <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-13 px-6 text-base text-text hover:bg-white/5">
            <Link href="/connexion">Essayer sans compte</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
