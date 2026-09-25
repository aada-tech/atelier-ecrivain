import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/marketing/legal-page';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Quelles données l’Atelier traite, pourquoi, combien de temps, et comment exercer vos droits (RGPD).',
  alternates: { canonical: '/confidentialite' },
};

export default function ConfidentialitePage() {
  const { legal } = SITE;
  return (
    <LegalPage title="Politique de confidentialité" updated="25 septembre 2026">
      <p>
        L’Atelier ({SITE.fullName}) est un outil d’écriture. Vos textes sont intimes : nous en collectons le minimum, nous ne les vendons
        pas, nous ne les exploitons pas à des fins publicitaires et nous ne les utilisons pas pour entraîner des modèles d’IA.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        {legal.publisher}, {legal.address}. Contact dédié aux données personnelles :{' '}
        <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>.
      </p>

      <h2>2. Données traitées et finalités</h2>
      <table>
        <thead>
          <tr>
            <th>Données</th>
            <th>Finalité</th>
            <th>Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Identifiant de compte, adresse e-mail, nom et photo fournis par Google le cas échéant, dates de création et de connexion
            </td>
            <td>Créer et sécuriser votre compte</td>
            <td>Exécution du contrat (art. 6-1-b RGPD)</td>
          </tr>
          <tr>
            <td>Manuscrits, chapitres, notes, suggestions acceptées ou rejetées, versions, surlignages, réglages de livre et couverture</td>
            <td>Stocker, synchroniser et exporter votre travail</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Profil (nom de plume, avatar), préférences d’écriture, objectif quotidien, statistiques de mots par jour</td>
            <td>Personnaliser l’atelier, afficher votre progression</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td id="ia">Passage de texte ou enregistrement audio que vous soumettez à une fonction d’IA</td>
            <td>Transcrire une dictée, proposer des ratures, vérifier des faits, rechercher des sources, illustrer une couverture</td>
            <td>
              Consentement explicite (art. 6-1-a et, le cas échéant, art. 9-2-a), recueilli avant la première utilisation et révocable
            </td>
          </tr>
          <tr>
            <td>
              Identifiant de compte et horodatage des requêtes IA (en mémoire, 24 h au plus) ; journaux techniques de l’hébergeur (adresse
              IP, navigateur)
            </td>
            <td>Prévenir les abus, limiter le débit, assurer la sécurité</td>
            <td>Intérêt légitime (art. 6-1-f)</td>
          </tr>
        </tbody>
      </table>
      <p>Nous ne réalisons aucun profilage publicitaire et n’utilisons aucun outil d’analyse d’audience tiers.</p>

      <h2>3. Intelligence artificielle</h2>
      <ul>
        <li>
          Aucun contenu n’est envoyé à une IA sans votre consentement, donné une fois dans l’application et révocable à tout moment dans
          Compte › IA.
        </li>
        <li>
          Seul le passage concerné est transmis, au moment où vous déclenchez la fonction. L’audio de dictée n’est pas conservé par
          l’Atelier.
        </li>
        <li>
          Les requêtes transitent par notre serveur puis sont traitées par l’API Google Gemini, en qualité de sous-traitant, selon les
          conditions de Google applicables aux services payants (pas d’utilisation pour l’entraînement ; conservation limitée à la détection
          d’abus).
        </li>
        <li>
          Si vous utilisez votre propre clé Gemini, elle est stockée uniquement dans votre navigateur et transmise à notre serveur à chaque
          requête sans y être conservée ; les conditions de votre compte Google s’appliquent alors.
        </li>
        <li>
          La dictée « directe » utilise la reconnaissance vocale intégrée à votre navigateur : selon celui-ci, l’audio peut être traité par
          son éditeur (par exemple Google pour Chrome, Apple pour Safari). Vous pouvez choisir le moteur de dictée dans Compte › Écriture.
        </li>
      </ul>

      <h2>4. Destinataires et sous-traitants</h2>
      <ul>
        <li>
          <strong>Google Ireland Ltd / Google LLC</strong> — Firebase Authentication, Cloud Firestore (hébergement des données) et, si
          l’option est activée, App Check (protection anti-abus) ; API Gemini pour les fonctions d’IA.
        </li>
        <li>
          <strong>Vercel Inc.</strong> — hébergement du site et exécution du serveur applicatif.
        </li>
      </ul>
      <p>
        Certains de ces prestataires peuvent traiter des données hors de l’Union européenne. Ces transferts sont encadrés par le cadre de
        protection des données UE–États-Unis (Data Privacy Framework) et/ou des clauses contractuelles types de la Commission européenne.
      </p>

      <h2>5. Durées de conservation</h2>
      <ul>
        <li>Compte et contenus : jusqu’à ce que vous supprimiez votre compte (suppression immédiate et définitive depuis Compte).</li>
        <li>Comptes d’essai sans adresse e-mail : peuvent être supprimés après 12 mois d’inactivité.</li>
        <li>Versions d’un chapitre : 25 au maximum, les plus anciennes sont remplacées automatiquement.</li>
        <li>
          Données de limitation de débit : 24 heures au plus, en mémoire. Journaux techniques de l’hébergeur : durée limitée fixée par
          celui-ci.
        </li>
      </ul>

      <h2>6. Stockage sur votre appareil</h2>
      <p>
        L’Atelier n’utilise aucun cookie publicitaire ni traceur. Il stocke localement, pour le seul fonctionnement du service que vous
        demandez : la session de connexion, une copie hors ligne de vos manuscrits (effacée à la déconnexion), vos préférences d’affichage
        et, si vous la saisissez, votre clé Gemini personnelle. Ces stockages sont strictement nécessaires et ne requièrent pas de
        consentement.
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Chiffrement en transit (HTTPS/HSTS) et au repos (infrastructure Google Cloud), cloisonnement strict des données par utilisateur au
        niveau de la base, validation de tout contenu, politique de sécurité du contenu (CSP), clé d’IA conservée uniquement côté serveur.
      </p>

      <h2>8. Vos droits</h2>
      <p>
        Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition, de portabilité et du droit de retirer
        votre consentement, ainsi que du droit de définir des directives relatives au sort de vos données après votre décès. La plupart
        s’exercent directement dans l’application : <Link href="/compte">Compte</Link> › Mes données (export complet) et Supprimer mon
        compte. Pour toute autre demande : <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>. Vous pouvez introduire une
        réclamation auprès de la{' '}
        <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">
          CNIL
        </a>
        .
      </p>

      <h2>9. Mineurs</h2>
      <p>Le service s’adresse aux personnes de 15 ans et plus. En deçà, l’accord d’un titulaire de l’autorité parentale est requis.</p>

      <h2>10. Modifications</h2>
      <p>
        Toute modification substantielle vous sera signalée dans l’application. Si elle concerne les traitements d’IA, votre consentement
        vous sera redemandé.
      </p>
    </LegalPage>
  );
}
