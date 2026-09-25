import type { ReactNode } from 'react';
import { SiteNav } from './site-nav';
import { SiteFooter } from './site-footer';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteNav />
      <main id="contenu" className="container-page max-w-3xl pt-36 pb-24">
        <h1 className="font-display text-5xl leading-tight sm:text-6xl">{title}</h1>
        <p className="mt-3 text-sm text-faint">Dernière mise à jour : {updated}</p>
        <div className="legal mt-12 space-y-5 text-[15.5px] leading-relaxed text-muted [&_a]:text-text [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-text [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-text [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:border-white/10 [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top [&_th]:pr-4 [&_th]:pb-2 [&_th]:text-left [&_th]:text-text">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
