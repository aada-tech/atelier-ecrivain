# RGPD

Ce document décrit ce que fait l’application et ce qui reste à la charge de l’exploitant du service. Il ne remplace pas un avis
juridique.

## Traitements

| Données                                   | Finalité                                  | Où                                  | Durée                          |
| ----------------------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------ |
| Compte (uid, e-mail, nom, photo Google)   | Authentification                          | Firebase Authentication             | Jusqu’à suppression du compte  |
| Manuscrits, notes, versions, statistiques | Service d’écriture                        | Cloud Firestore                     | Jusqu’à suppression            |
| Texte ou audio envoyés à l’IA             | Transcription, suggestions, vérification  | Proxy `/api/ai` puis API Gemini     | Non conservés par l’Atelier    |
| Préférences (thème, dernier chapitre)     | Confort d’utilisation                     | Navigateur (localStorage)           | Effacées à la déconnexion      |

Aucun cookie publicitaire ni outil de mesure d’audience n’est intégré : pas de bannière de consentement cookies nécessaire en
l’état. Si un outil de mesure est ajouté, il faudra un consentement préalable (ou un outil exempté, configuré en conséquence).

## Consentement IA

Les fonctions IA sont désactivées tant que l’utilisateur n’a pas accepté, dans l’application, l’envoi de ses textes au fournisseur
d’IA (version du consentement enregistrée dans le profil, retirable à tout moment dans Compte). La dictée « navigateur » passe par
le service de reconnaissance vocale du navigateur, ce qui est indiqué dans la politique de confidentialité.

## Droits des personnes (intégrés à l’application)

- **Accès et portabilité** : Compte › « Exporter mes données » produit une archive ZIP (JSON complet + un fichier Markdown par
  manuscrit).
- **Rectification** : directement dans l’application.
- **Effacement** : Compte › « Supprimer mon compte » supprime tous les documents Firestore de l’utilisateur puis le compte
  d’authentification (ré-authentification demandée si nécessaire).

## Check-list de l’exploitant

L’Atelier est un outil de brouillon : aucune information d’éditeur, d’adresse ni de publication n’est affichée ou demandée
(pas d’ISBN ni de page de copyright dans les exports). Les pages légales ne nomment que les hébergeurs.

1. Utiliser une clé Gemini d’un projet **en offre payante** : selon les conditions de Google, les contenus de l’offre gratuite
   peuvent servir à améliorer ses produits.
2. Choisir la région Firestore (de préférence dans l’UE, ex. `eur3`) à la création du projet.
3. Encadrer les transferts hors UE (Google, Vercel) : clauses contractuelles types / Data Privacy Framework, à mentionner dans la
   politique de confidentialité.
4. Tenir le registre des traitements et, le cas échéant, signer les avenants de sous-traitance (DPA) Google Cloud et Vercel.
5. Comptes anonymes : activer le nettoyage automatique des comptes anonymes inactifs (Identity Platform) ou planifier une purge,
   et le mentionner dans la politique de confidentialité.
