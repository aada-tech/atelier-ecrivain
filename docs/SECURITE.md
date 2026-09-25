# Sécurité

## Données (Firestore)

- Chaque utilisateur ne lit et n’écrit que sous `users/{son uid}` ; tout le reste est refusé par défaut.
- Chaque écriture est validée : liste blanche de champs, types, tailles, valeurs autorisées (`firestore.rules`).
- Les versions sont immuables ; la couverture doit être une image JPEG/PNG/WebP en data URL de 1 Mo au plus.
- L’ancienne collection partagée `system/quotas`, modifiable par tous, n’existe plus : les quotas IA sont tenus côté serveur.
- Storage n’est pas utilisé : `storage.rules` refuse tout.
- Les règles sont testées contre l’émulateur (`tests/rules/`, `npm run test:rules`).

## Clés et secrets

- La clé Gemini ne vit que côté serveur (`GEMINI_API_KEY`, sans préfixe `NEXT_PUBLIC_`) ; les modules serveur importent
  `server-only` pour qu’une importation accidentelle côté client casse le build.
- La vérification des jetons Firebase n’utilise aucun compte de service : clés publiques de `securetoken`, algorithme RS256 imposé,
  émetteur et audience vérifiés.
- La configuration web Firebase (`NEXT_PUBLIC_FIREBASE_*`) est publique par nature ; App Check (reCAPTCHA Enterprise) peut être
  activé avec `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
- Une clé personnelle est conservée uniquement dans le navigateur de l’utilisateur, transmise par en-tête pour une seule requête,
  jamais stockée ni journalisée côté serveur. Une clé malformée est refusée (elle ne peut pas servir à contourner le quota).

## API IA

- Jeton Firebase obligatoire, contrôle de l’origine, limitation de débit par utilisateur (minute + jour).
- Entrées et sorties validées par zod, tailles bornées (texte, audio ≤ 4 Mo).
- Réponses `Cache-Control: no-store`.
- Injection de prompt : le texte de l’auteur est encadré et présenté au modèle comme donnée ; les sorties sont validées par schéma
  et n’atteignent le document qu’après acceptation explicite de l’auteur.
- Les sources de recherche (Google Search) sont filtrées (`http(s)` uniquement) ; le widget de recherche Google fourni par l’API
  est affiché dans une iframe `sandbox` sans scripts de même origine.

## XSS

- Aucun `dangerouslySetInnerHTML` sur du contenu utilisateur : l’éditeur manipule un schéma ProseMirror restreint, les exports
  (EPUB, Markdown) échappent tout le texte, la migration v1 analyse l’ancien HTML sans DOM et n’en garde que le texte.
- Les liens externes sont restreints à `http(s)` et ouverts avec `rel="noopener noreferrer"`.
- La redirection après connexion n’accepte que des chemins internes (`safeNext`).

## En-têtes HTTP (`next.config.ts`)

Content-Security-Policy (dont `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, pas
d’`unsafe-eval` en production : seul `'wasm-unsafe-eval'` est permis, pour le moteur de mise en page du PDF), HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy` (micro limité à notre origine), `Cross-Origin-Opener-Policy: same-origin-allow-popups` (connexion Google).
Les tests e2e vérifient ces en-têtes.

## Déconnexion

La déconnexion vide le cache Firestore local (IndexedDB) et les préférences `atelier:*`, pour qu’un appareil partagé ne conserve
pas les manuscrits.

## Limites connues

- La limitation de débit est en mémoire par instance : suffisante contre les abus d’un compte, pas stricte en multi-instances.
  Brancher un stockage partagé (Upstash Redis…) derrière `checkRateLimit` si nécessaire.
- `script-src` conserve `'unsafe-inline'` (scripts d’hydratation Next.js sans nonce). Passer à une CSP à nonce impose un rendu
  dynamique de toutes les pages.
