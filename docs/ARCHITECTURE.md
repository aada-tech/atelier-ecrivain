# Architecture

## Pile

- **Next.js 16** (App Router, Turbopack, React Compiler) sur **React 19**, TypeScript strict.
- **Tailwind CSS v4** : jetons de thème dans `src/app/globals.css` (thèmes clair, sépia, nuit via `data-theme`), requêtes de
  conteneur pour les composants réutilisés à plusieurs tailles (dock de dictée, maquettes de la landing).
- **Firebase 12** (SDK modulaire) : Auth et Firestore avec cache persistant multi-onglets (écriture hors ligne).
- **TipTap 3** pour l’éditeur, **GSAP 3** (ScrollTrigger, SplitText) pour la landing, **Radix UI**, **cmdk**, **sonner**.
- **@react-pdf/renderer** (PDF avec police Literata embarquée) et **fflate** (EPUB 3, archives d’export).

L’application n’est plus un export statique : les routes `/api/ai/*` s’exécutent côté serveur (runtime Node.js) pour que la clé Gemini
ne quitte jamais le serveur. Tout le reste est statique ou rendu côté client.

## Arborescence

```
src/
  app/
    (marketing)/          landing, pages légales, studio de reels — thème nuit
    (app)/                connexion, bibliothèque, atelier, liseuse, compte — noindex
    api/ai/*/route.ts     proxy IA (transcribe, analyze, factcheck, research, cover)
  components/
    ui/                   primitives (bouton, dialogue, menu, champ…)
    atelier/              éditeur, dictée, panneaux, palette de commandes
    marketing/            sections de la landing, scènes animées, reels
  features/export/        mise en page PDF (couverture, sommaire, chapitres, notes)
  lib/
    doc/                  modèle de document v2, texte, migration v1
    data/                 accès Firestore par entité
    dictation/            reconnaissance, enregistrement, commandes vocales
    ai/                   contrats zod partagés client/serveur, client HTTP
  server/                 vérification des jetons, limitation de débit, Gemini, prompts
```

## Modèle de données

Tout est cloisonné sous `users/{uid}` :

| Chemin                                  | Contenu                                                          |
| --------------------------------------- | ---------------------------------------------------------------- |
| `profile/info`                          | nom de plume, objectif quotidien, consentement IA, moteur dictée |
| `manuscripts/{mid}`                     | titre, genre, accent, objectif, compteurs                        |
| `manuscripts/{mid}/chapters/{cid}`      | `doc` (JSON ProseMirror restreint), notes, suggestions, statut   |
| `manuscripts/{mid}/snapshots/{sid}`     | versions figées, immuables                                       |
| `manuscripts/{mid}/meta/{book,cover,reader}` | réglages d’édition, couverture (data URL ≤ 1 Mo), liseuse   |
| `stats/{AAAA-MM-JJ}`                    | mots écrits par jour (série, graphique d’activité)               |

**Document v2.** Chaque chapitre stocke un document ProseMirror au schéma restreint : paragraphes, intertitres (niveaux 2–3),
citations, séparateurs, gras/italique, sauts de ligne et appels de note (`noteRef`). `normalizeDoc` (`src/lib/doc/text.ts`) élimine
tout ce qui sort de ce schéma, à la lecture comme à l’import. Aucun HTML n’est stocké ni injecté.

**Migration v1.** Les anciens chapitres (HTML de `contentEditable`, exposants Unicode pour les notes, `pendingReviews`) sont convertis
à la lecture par `chapterFromFirestore` (`src/lib/doc/legacy.ts`) sans DOM ; la première sauvegarde écrit le format v2 et supprime
les champs v1.

## Synchronisation (atelier)

`useWorkspace` (`src/components/atelier/use-workspace.ts`) :

- lecture temps réel des chapitres ; le cache persistant rend l’atelier utilisable hors ligne ;
- brouillons locaux par chapitre, sauvegarde différée (800 ms, au plus 5 s d’attente), forcée à la mise en arrière-plan ;
- un brouillon envoyé reste affiché jusqu’à ce que Firestore reflète l’écriture (pas de clignotement ni de perte de focus) ;
- une modification venue d’un autre appareil remplace le chapitre ouvert s’il n’a pas de brouillon ; sinon la version distante est
  archivée dans les versions et la version locale gagne. Rien n’est perdu.

## Dictée

Trois moteurs (`src/lib/dictation/`, `use-dictation.ts`) :

- **navigateur** (Web Speech API) : texte en direct, gratuit ;
- **cloud** : enregistrement (MediaRecorder, 32 kb/s) puis transcription Gemini, plus fidèle ;
- **hybride** (défaut sur ordinateur) : texte en direct puis version cloud relue, avec les reprises de l’auteur proposées en
  suggestions.

Les commandes vocales (« virgule », « à la ligne », « ouvrez les guillemets »…) et la typographie française sont appliquées par
`applyVoiceCommands` (`format.ts`).

## IA

Le navigateur appelle `/api/ai/*` avec son jeton Firebase. Chaque route :

1. vérifie l’origine, le jeton (signature RS256 contre les clés publiques Google, émetteur et audience du projet) ;
2. choisit la clé (personnelle si fournie et valide, sinon celle du serveur) ;
3. applique la limitation de débit par utilisateur (coût pondéré : texte 1, audio/recherche 2, image 4 ; quota réduit pour les
   sessions anonymes) ;
4. valide l’entrée avec zod, appelle Gemini en REST avec une chaîne de repli de modèles (`AI_MODELS_*`) ;
5. valide la sortie avec zod avant de la renvoyer.

Le texte du manuscrit est encadré dans les prompts (`<manuscrit>…</manuscrit>`) et traité comme donnée, jamais comme instruction.

## Landing et reels

Les scènes de la landing (`src/components/marketing/scenes/`) montent les vrais composants de l’application (dock de dictée, carte de
suggestion, liseuse…) et les animent avec des timelines GSAP. Les mêmes scènes alimentent le studio de reels 9:16 (`/reels`) et
l’enregistrement vidéo (`scripts/record-reels.mjs`). Les animations respectent `prefers-reduced-motion`.
