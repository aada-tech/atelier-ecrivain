import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/legal-page';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Conditions d’utilisation',
  alternates: { canonical: '/conditions' },
};

export default function ConditionsPage() {
  return (
    <LegalPage title="Conditions d’utilisation" updated="25 septembre 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions encadrent l’utilisation de {SITE.fullName} (« l’Atelier »), un service en ligne d’écriture, de dictée, de
        relecture et d’export de manuscrits.
      </p>

      <h2>2. Compte</h2>
      <p>
        L’accès se fait avec un compte Google, un lien de connexion par e-mail ou un compte d’essai lié au navigateur. Vous êtes responsable
        de la confidentialité de votre moyen de connexion. Un compte d’essai peut être converti à tout moment en compte permanent.
      </p>

      <h2>3. Vos textes</h2>
      <p>
        Vous conservez l’intégralité de vos droits sur vos contenus. Vous accordez à l’éditeur la seule autorisation technique nécessaire
        pour les héberger, les synchroniser entre vos appareils et, à votre demande, les transmettre aux fonctions d’IA. Cette autorisation
        prend fin avec la suppression des contenus ou du compte.
      </p>

      <h2>4. Fonctions d’intelligence artificielle</h2>
      <p>
        Les transcriptions, ratures, vérifications et recherches sont des propositions automatiques qui peuvent comporter des erreurs. Elles
        ne remplacent ni votre jugement ni une vérification humaine, notamment avant publication. Leur utilisation est soumise à un quota
        quotidien raisonnable, susceptible d’évoluer.
      </p>

      <h2>5. Usage acceptable</h2>
      <p>
        Il est interdit d’utiliser l’Atelier pour porter atteinte aux droits de tiers, contourner ses mesures de sécurité ou de limitation,
        ou en perturber le fonctionnement. Un usage abusif peut entraîner la suspension de l’accès aux fonctions d’IA ou du compte.
      </p>

      <h2>6. Disponibilité</h2>
      <p>
        L’Atelier est fourni en l’état, avec une obligation de moyens. Le fonctionnement hors ligne et l’export à tout moment sont conçus
        pour que vous gardiez la maîtrise de vos textes ; nous vous recommandons d’exporter régulièrement vos manuscrits importants.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        L’éditeur ne saurait être tenu responsable des dommages indirects résultant de l’utilisation du service, ni du contenu des textes
        rédigés par les utilisateurs.
      </p>

      <h2>8. Résiliation</h2>
      <p>Vous pouvez supprimer votre compte à tout moment depuis la page Compte ; vos données sont alors effacées définitivement.</p>

      <h2>9. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. Le consommateur peut recourir gratuitement à un médiateur de la
        consommation.
      </p>
    </LegalPage>
  );
}
