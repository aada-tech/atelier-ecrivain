# Instructions & Directives — Atelier de l'Écrivain

- **Gouvernance & Rôles** : Modèle de l'Équipe Chirurgicale (**Loi de Brooks-Zero**).
  - Consulter obligatoirement [Règles Chirurgicales](file:///.agents/rules/surgical_rules.md) et [Registre des Décisions](file:///.agents/memory/decisions.md).
  - **Chirurgien Unique** : Une seule main écrit dans le code source du projet.
  - **Anti-Polling** : Interdiction du busy-polling répétitif (prévention de surconsommation de tokens).
- **Stack Technique** : Next.js 16 (App Router, hybride : pages statiques + routes serveur `/api/ai/*` sur Vercel), React 19 + React Compiler, TypeScript strict, Tailwind CSS v4, TipTap 3, GSAP 3, Firebase 12 (Auth, Firestore, App Check). Voir [Architecture](docs/ARCHITECTURE.md).
- **Vérifications avant commit** : `npm run check` (lint, types, tests, build) ; `npm run test:rules` si `firestore.rules` change ; `npm run test:e2e` pour le site public.
- **Directives de Sécurité** :
  1. Respecter strictement la moindre privilège sur les règles de sécurité Firestore (`firestore.rules`) et Storage (`storage.rules`).
  2. Systématiquement assainir et échapper le contenu HTML dynamique (prévention XSS).
  3. Aucune clé d'API privée ni secret de service account ne doit être présent dans le code bundle client (les modules `src/server/*` importent `server-only`).
  4. Le contenu des chapitres reste un document ProseMirror au schéma restreint (`normalizeDoc`) : jamais de HTML stocké ni injecté. Voir [Sécurité](docs/SECURITE.md).
