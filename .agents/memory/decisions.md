# Registre des Décisions & Mémoire Commune (Atelier de l'Écrivain)

Ce registre consigne les choix structurants d'architecture, les conventions techniques et les arbitrages pour éviter toute régression ou dérive de contexte.

---

### Modèle d'entrée :
- **Date** : AAAA-MM-JJ
- **Domaine** : [Architecture | Sécurité | Modélisation | Sync]
- **Problème / Contexte** : Situation nécessitant un arbitrage.
- **Décision tranchée** : Règle ou choix technique adopté.
- **Raison & Rationale** : Pourquoi cette solution a été retenue et contre-exemples écartés.

---

## Décisions Actées

### 2026-09-11 | Architecture des Agents & Consommation de Tokens
- **Problème** : Risque d'inflation de contexte et gaspillage de quota via des boucles de polling intempestives (incident Astra/Luna : 47 sondages inutiles = 7,1M tokens consommés) et conflits de merge multi-agents (loi de Brooks).
- **Décision tranchée** : Adoption du protocole Brooks-Zero :
  1. Le Lead Agent est le **Chirurgien Unique** (seul habilité à modifier le code source).
  2. Les sous-agents sont éphémères, en lecture seule, plafonnés à 2 maximum, et communiquent via `.agents/scratchpad/`.
  3. Interdiction absolue du busy-polling : attente d'événements réactifs, pas de requêtes de statut en boucle courte.
- **Raison** : Maîtrise prédictive des coûts en tokens et préservation de la cohérence logique du codebase.

### 2026-09-11 | Architecture Frontend & Déploiement Statique — *remplacée le 2026-09-25 (voir « Architecture hybride »)*
- **Problème** : Déploiement statique Next.js App Router couplé à Firebase sans serveur Node dédié (`output: 'export'`).
- **Décision tranchée** :
  1. Toute la logique d'état et d'accès aux données s'exécute côté client (React hooks, contextes, Firebase Web SDK).
  2. Aucune API route dynamique (`/api/*`) dépendant d'un runtime serveur Node.js dans le bundle statique.
- **Raison** : Hébergement ultra-léger, résilient, sécurisé et totalement découplé.

### 2026-09-11 | Directives de Sécurité Firebase & XSS
- **Problème** : Risques d'exfiltration de données, d'écrasement de manuscrits tiers et d'injection de code malveillant dans les contenus d'écriture enrichie.
- **Décision tranchée** :
  1. Moindre privilège strict dans `firestore.rules` et `storage.rules` (vérification systématique de `request.auth.uid == userId`).
  2. Échappement et assainissement systématique de tout contenu HTML injecté dynamiquement.
  3. Zéro secret ou token de compte de service dans le bundle client.
- **Raison** : Protection absolue de l'intégrité et de la confidentialité des œuvres des écrivains.

### 2026-09-11 | Dictée Vocale Mobile & Décodage STT Gemini
- **Problème** : La dictée audio ne fonctionnait pas sur mobile (Safari iOS / Android) : blocage micro par conflit de session audio (`LiveSpeechRecognizer`), corruption des chunks MP4 par `start(1000)` sur WebKit, rejet par contraintes `sampleRate` et réponse vide sur `gemini-3.5-transcribe` (`audioTranscription.text` non lu par le SDK).
- **Décision tranchée** :
  1. Extraction STT universelle : support de `part.audioTranscription.text` (Gemini 3.5 Transcribe) et `part.text` (Gemini 3.6/3.7 Flash) avec fallback si réponse vide.
  2. Détection binaire du MIME type par magic bytes (`ftyp` pour MP4, `1A 45 DF A3` pour WebM, `RIFF` pour WAV) pour fiabiliser l'ingestion multimodale.
  3. Suppression du timeslice sur Safari/MP4 dans `AudioRecorder` (génération d'un conteneur intègre à l'arrêt).
  4. Isolation du microphone sur mobile : désactivation de la reconnaissance locale concurrente pour préserver l'accès exclusif d'`AVAudioSession`.

### 2026-09-11 | Ergonomie Mobile & Atelier « En Trajet » (Japandi UI)
- **Problème** : L'interface de l'Atelier était conçue pour le confort de bureau mais manquait d'ergonomie à une main sur smartphone (difficulté d'accéder aux chapitres sans ouvrir un grand tiroir, ajout de paragraphe fastidieux, bouton de dictée enfoui ou mal adapté aux micro-moments de trajet).
- **Décision tranchée** :
  1. Introduction d'une barre tactile basse (`MobileBottomBar`) optimisée pour le pouce (zone inférieure à portée directe), n'apparaissant que sur mobile (`<= 900px`).
  2. FAB de dictée tactile centrale (58px) avec transition fluide vers le dock d'enregistrement (pulsation terracotta, timer lisible, grand bouton d'arrêt 48px, pause/annulation, retour visuel IA immédiat).
  3. Sélecteur rapide de chapitre intégré avec bouton `+ Ch` immédiat.
  4. Bouton d'ajout de paragraphe en 1 tap (`+ Bloc`) dans la barre basse et barres d'insertion contextuelles (`.editor-append-bar` et inter-blocs tactiles) avec cibles tactiles WCAG 2.2 AAA (>= 44px).
  5. Masquage propre du dock flottant desktop sur mobile pour éviter toute superposition ou encombrement de l'écran.
- **Raison** : Offrir aux écrivains une expérience de saisie nomade fluide, naturelle et zen pendant les trajets quotidiens.

### 2026-09-13 | Dictée Vocale Mobile WYSIWYG & Correction Événementielle Tactile
- **Problème** : Sur mobile (iOS/Android), le tap sur l'icône de dictée fermait le clavier, sortait l'utilisateur du paragraphe et ne transcrivait rien en temps réel. Causes identifiées : (1) `onTouchStart` avec `preventDefault()` bloquait l'événement W3C `click` sur écran tactile ; (2) Conflit de capture microphone matériel (`getUserMedia` préemptait `webkitSpeechRecognition`) ; (3) Déconnexion visuelle : la transcription s'affichait dans une boîte externe sous le bloc au lieu de s'inscrire directement dans le texte ; (4) Perte du bloc actif lors du blur.
- **Décision tranchée** :
  1. **Purge des `preventDefault` tactiles** : Suppression des `onTouchStart` parasites sur les boutons d'action et la FAB mobile pour garantir le déclenchement standard du `click` et préserver le focus.
  2. **Streaming WYSIWYG In-Situ** : Les mots prononcés s'affichent en temps réel directement à l'intérieur du paragraphe actif (`.editor-block-content` avec `.dictation-inline-zone` et curseur terracotta clignotant), sans boîte flottante déconnectée.
  3. **Mémorisation du Bloc Actif** : Préservation de la cible via `lastFocusedBlockIdRef` dans `AtelierPage` pour garantir que la dictée s'injecte exactement dans le paragraphe édité, même si le clavier virtuel se rétracte.
  4. **Exclusivité Audio Session** : Séparation stricte des pipelines. Si `LiveSpeechRecognizer.isSupported()` est vrai, il prend le contrôle exclusif du micro (aucun `getUserMedia` concurrent). À l'arrêt, le texte transcrit est injecté immédiatement dans le paragraphe, puis magnifié en tâche de fond par Gemini sans blocage UI.
  5. **Détection Secure Context** : Vérification de `window.isSecureContext` et message explicite si l'accès se fait via HTTP LAN (`http://192.168.x.x`) qui désactive le Web Speech API sur les navigateurs mobiles.
- **Raison** : Rétablir une dictée vocale instantanée, fidèle et ergonomique pour l'écriture nomade sur smartphone.

### 2026-09-25 | Architecture hybride : proxy IA côté serveur
- **Problème** : En export statique, la clé Gemini devait être exposée au navigateur et les quotas étaient tenus dans une collection Firestore partagée (`system/quotas`) modifiable par tout utilisateur connecté.
- **Décision tranchée** :
  1. Abandon de `output: 'export'` : Next.js hybride sur Vercel. Pages statiques, routes `/api/ai/*` en runtime Node.js.
  2. La clé Gemini ne vit que côté serveur (`GEMINI_API_KEY`). Chaque route vérifie le jeton Firebase (JWKS securetoken, RS256, émetteur/audience), l'origine, applique un débit par uid, valide entrées et sorties avec zod.
  3. Suppression de `system/quotas` ; règles Firestore en refus par défaut avec liste blanche de champs.
- **Raison** : Seule façon de ne pas distribuer la clé IA et de rendre les quotas inviolables, sans compte de service. Contre-exemple écarté : Cloud Functions (déploiement séparé, démarrages à froid, second pipeline).

### 2026-09-25 | Modèle de document v2 (ProseMirror restreint)
- **Problème** : La v1 stockait du HTML de `contentEditable` non assaini (risque XSS), des appels de note en exposants Unicode et un bloc par paragraphe, ce qui rendait l'édition fragile.
- **Décision tranchée** :
  1. Un chapitre = un document JSON TipTap/ProseMirror au schéma restreint (paragraphe, intertitre 2–3, citation, séparateur, gras/italique, saut de ligne, `noteRef`), normalisé par `normalizeDoc` à chaque lecture et import.
  2. Migration v1 → v2 à la lecture (`chapterFromFirestore`), sans DOM ; la première sauvegarde supprime les champs v1.
  3. Rendus neutres (`docToRenderBlocks`) partagés par la liseuse, le PDF, l'EPUB et le Markdown.
- **Raison** : Aucun HTML ne transite ; les notes sont des nœuds numérotés automatiquement ; un seul modèle pour tous les rendus.

### 2026-09-25 | Synchronisation par chapitre et hors ligne
- **Problème** : Sauvegarde du manuscrit entier, écrasements entre appareils, perte de saisie.
- **Décision tranchée** : Cache Firestore persistant multi-onglets ; brouillon local par chapitre avec sauvegarde différée (800 ms, 5 s max) ; le brouillon envoyé reste affiché jusqu'à l'accusé de Firestore ; en cas de modification distante concurrente, la version locale gagne et la distante est archivée en version.
- **Raison** : Aucun texte perdu, aucun clignotement, écriture possible hors ligne (métro, avion).

### 2026-09-25 | Dictée à trois moteurs
- **Problème** : Web Speech API inégale selon les navigateurs, transcription cloud plus fidèle mais différée ; conflits de micro sur mobile.
- **Décision tranchée** : Moteurs « navigateur », « cloud » et « hybride » (défaut sur ordinateur : texte en direct puis version Gemini relue). Sur mobile, un seul pipeline tient le micro. Commandes vocales et typographie française appliquées localement (`applyVoiceCommands`).
- **Raison** : Retour immédiat à l'écran et qualité finale, sans double capture du micro sur iOS/Android. Les décisions mobiles du 2026-09-11 et 2026-09-13 restent valables dans leur principe (exclusivité audio, pas de timeslice sur MP4, détection MIME binaire).

### 2026-09-25 | Landing et publicités à partir des composants réels
- **Problème** : Illustrer l'application (landing, TikTok/Reels) sans maquettes qui divergent du produit.
- **Décision tranchée** : Les scènes animées (GSAP) montent les vrais composants (dock de dictée, carte de suggestion, liseuse…) dans une coque d'application à requêtes de conteneur ; les mêmes scènes alimentent le studio `/reels` (9:16) et `scripts/record-reels.mjs` (vidéos 1080×1920).
- **Raison** : Les visuels promotionnels suivent automatiquement l'évolution de l'interface ; une seule source d'animation.

### 2026-09-25 | RGPD intégré au produit
- **Problème** : Pas d'export ni de suppression de données, pas de consentement à l'envoi de textes à l'IA, pages légales absentes.
- **Décision tranchée** : Consentement IA versionné et révocable ; export ZIP complet (JSON + Markdown) ; suppression de toutes les données puis du compte ; pages confidentialité, mentions légales, conditions ; purge du cache local à la déconnexion ; aucun traceur tiers. Check-list exploitant dans `docs/RGPD.md`.
- **Raison** : Droits d'accès, de portabilité et d'effacement exerçables sans intervention manuelle.

### 2026-09-25 | L'Atelier est un outil de brouillon, pas de publication
- **Problème** : Les pages légales et l'export demandaient des informations d'édition (éditeur, adresse, directeur de la publication, ISBN, année de copyright) sans objet pour un outil de brouillon.
- **Décision tranchée** : Suppression de ces champs : `SITE` ne garde que l'hébergeur ; plus de section « Éditeur » ni de « Responsable du traitement » nommé ; l'export PDF/EPUB n'a plus ni champs Éditeur/ISBN/Année ni page de copyright (l'épigraphe a sa propre page) ; les anciennes valeurs stockées sont ignorées au chargement.
- **Raison** : Décision produit : l'auteur n'y publie pas son livre ; les exports servent à relire et partager un manuscrit.

