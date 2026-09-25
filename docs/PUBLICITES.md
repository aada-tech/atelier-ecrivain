# Publicités : studio de reels

Les vidéos promotionnelles verticales (TikTok, Instagram Reels, YouTube Shorts) sont produites à partir des **scènes réelles** de
l’application : chaque scène monte les vrais composants (dock de dictée, carte de rature, vérification des faits, export, liseuse)
et les anime avec GSAP. Quand l’interface évolue, les vidéos suivent.

## Les cinq reels

| Id        | Titre     | Message                                                  |
| --------- | --------- | -------------------------------------------------------- |
| `dictee`  | Dicter    | La voix devient texte, la ponctuation suit               |
| `ratures` | Raturer   | L’IA propose, l’auteur décide                            |
| `faits`   | Vérifier  | 1887 ou 1889 ? Vérifié et sourcé en quelques secondes    |
| `livre`   | Composer  | De la voix au livre imprimé : PDF + EPUB                 |
| `liseuse` | Relire    | Relire comme un vrai livre, même hors ligne              |

Les sous-titres cinétiques (mot à mot, mots-clés surlignés) et la barre de progression façon « stories » sont calés sur la durée
réelle de chaque scène. Configuration : `REELS` dans `src/components/marketing/reel.tsx`.

## Prévisualiser

`/reels` (non indexé) affiche chaque reel ; « Ouvrir en mode capture » montre la vidéo seule en plein écran
(`/reels?capture=1&reel=dictee`).

## Générer les vidéos

```bash
npm run build && npm start          # dans un premier terminal
npm run reels:record                # dans un second
# options : -- --only=dictee,faits --seconds=20 --base=http://localhost:3000
```

Sortie : `reels-output/<id>.webm` en 1080×1920 (et `.mp4` H.264 si `ffmpeg` est installé, format le plus accepté par les
plateformes). La scène, conçue en 360×640, est agrandie en vectoriel : le rendu reste net.

Pour TikTok, ajouter musique et voix off directement dans l’éditeur de la plateforme (musiques sous licence).
