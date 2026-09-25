# L’Atelier de l’Écrivain

**Parlez. Votre livre s’écrit.** L’atelier d’écriture qui transforme la voix en manuscrit : dictée en temps réel, ratures suggérées
par l’IA (que l’auteur accepte ou refuse), vérification des faits sourcée, notes de bas de page, versions, liseuse et export PDF/EPUB
prêt à imprimer.

👉 [atelier-ecrivain.vercel.app](https://atelier-ecrivain.vercel.app)

## Ce que fait l’application

| Espace          | Route           | Fonctionnalités                                                                                                                         |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Landing         | `/`             | Présentation animée (GSAP) dont les scènes réutilisent les vrais composants de l’application                                             |
| Connexion       | `/connexion`    | Google, lien magique par e-mail, essai sans compte (session anonyme convertible sans perte)                                               |
| Bibliothèque    | `/bibliotheque` | Manuscrits, modèles (roman, essai, mémoires, guide), import `.txt`/`.md`, objectifs et série de jours d’écriture                         |
| Atelier         | `/atelier?m=…`  | Éditeur TipTap, dictée (navigateur, cloud ou hybride), commandes vocales, ratures IA, faits, recherche, notes, versions, palette ⌘K       |
| Liseuse         | `/liseuse?m=…`  | Lecture paginée, thèmes jour/sépia/nuit, surlignages, lecture à voix haute, reprise de la position                                      |
| Compte          | `/compte`       | Profil, consentement IA, clé Gemini personnelle facultative, export de toutes les données (RGPD), suppression du compte                    |
| Studio de reels | `/reels`        | Vidéos 9:16 (TikTok, Reels, Shorts) générées à partir des scènes réelles — voir [docs/PUBLICITES.md](docs/PUBLICITES.md)                  |

## Démarrer

Prérequis : Node.js ≥ 22.12 (et Java 21 pour les émulateurs Firebase).

```bash
npm install
cp .env.example .env.local   # renseigner la configuration Firebase web + GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```

### Sans projet Firebase : émulateurs locaux

```bash
npm run emulators            # Auth (9099) + Firestore (8080), projet demo-atelier
npm run dev:local            # l’application se connecte aux émulateurs
```

L’essai sans compte fonctionne immédiatement ; les fonctions IA demandent une clé Gemini (serveur ou personnelle).

## Scripts

| Commande                      | Rôle                                                                     |
| ----------------------------- | ------------------------------------------------------------------------ |
| `npm run check`               | lint + types + tests unitaires + build                                   |
| `npm test`                    | tests unitaires (Vitest)                                                 |
| `npm run test:rules`          | règles Firestore contre l’émulateur                                      |
| `npm run test:e2e`            | parcours Playwright du site public, des en-têtes de sécurité et de l’API |
| `npm run test:e2e:emulators`  | parcours complet de l’application contre les émulateurs                  |
| `npm run reels:record`        | enregistre les reels en 1080×1920                                        |
| `npm run format`              | Prettier (+ tri des classes Tailwind)                                    |

## Déploiement (Vercel)

1. Importer le dépôt dans Vercel (framework Next.js détecté).
2. Variables d’environnement : celles de `.env.example`. `GEMINI_API_KEY` reste **sans** préfixe `NEXT_PUBLIC_`.
3. Firebase : activer les fournisseurs Google, Lien e-mail et Anonyme ; ajouter le domaine Vercel aux domaines autorisés ;
   déployer les règles : `npx firebase-tools deploy --only firestore:rules,storage`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — pile technique, modèle de données, synchronisation, IA
- [Sécurité](docs/SECURITE.md) — menaces traitées et mesures
- [RGPD](docs/RGPD.md) — traitements, droits, check-list de l’exploitant
- [Publicités](docs/PUBLICITES.md) — studio de reels et captation vidéo
