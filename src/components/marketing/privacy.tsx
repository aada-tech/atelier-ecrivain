import Link from 'next/link';
import { Download, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { SectionHeading, FadeIn } from './reveal';

const PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Consentement d’abord',
    text: 'Aucun mot n’est envoyé à une IA sans votre accord explicite — et seulement le passage que vous choisissez. Révocable en un clic.',
  },
  {
    icon: EyeOff,
    title: 'Zéro publicité, zéro traceur',
    text: 'Pas de cookies publicitaires ni d’outils d’analyse tiers. Même les polices sont servies depuis nos serveurs.',
  },
  {
    icon: Download,
    title: 'Vos données, portables',
    text: 'Export complet en un clic (JSON + Markdown). Suppression définitive du compte et de tous vos textes en un autre.',
  },
  {
    icon: KeyRound,
    title: 'Sécurité par conception',
    text: 'Clé IA gardée côté serveur, contenu jamais interprété comme du code, accès cloisonné par utilisateur, en-têtes CSP et HSTS.',
  },
];

export function Privacy() {
  return (
    <section id="confidentialite" className="relative overflow-hidden py-28 sm:py-36" aria-labelledby="privacy-title">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(62_207_142/0.08),transparent_60%)]"
      />
      <div className="relative container-page">
        <SectionHeading
          id="privacy-title"
          eyebrow="Confidentialité"
          title={
            <>
              Vos manuscrits <em className="text-gradient-iris">vous appartiennent</em>.
            </>
          }
          lead="Un texte en cours est intime. L’Atelier est conçu pour le RGPD, pas adapté après coup."
        />
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <FadeIn key={p.title} delay={i * 0.08} className="h-full">
              <article className="h-full rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
                <span className="inline-grid size-10 place-items-center rounded-xl bg-sage/15 text-sage">
                  <p.icon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{p.text}</p>
              </article>
            </FadeIn>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-faint">
          Détails complets dans notre{' '}
          <Link href="/confidentialite" className="text-muted underline underline-offset-4 hover:text-text">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
