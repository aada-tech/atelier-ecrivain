import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/legal-page';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Mentions légales',
  alternates: { canonical: '/mentions-legales' },
};

export default function MentionsLegalesPage() {
  const { legal } = SITE;
  return (
    <LegalPage title="Mentions légales" updated="25 septembre 2026">
      <h2>Éditeur</h2>
      <p>
        {legal.publisher}
        <br />
        {legal.address}
        <br />
        Contact : <a href={`mailto:${legal.email}`}>{legal.email}</a>
        <br />
        Directeur·rice de la publication : {legal.director}
      </p>

      <h2>Hébergement</h2>
      <p>
        Site et serveur applicatif : {legal.host}.
        <br />
        Données des comptes et manuscrits : Google Cloud (Firebase), Google Ireland Ltd, Gordon House, Barrow Street, Dublin 4, Irlande.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        La marque, le logotype, l’interface et le code de l’Atelier sont protégés. Les textes que vous rédigez dans l’Atelier restent votre
        propriété exclusive : l’éditeur n’acquiert aucun droit sur eux.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Voir la <a href="/confidentialite">politique de confidentialité</a>.
      </p>
    </LegalPage>
  );
}
