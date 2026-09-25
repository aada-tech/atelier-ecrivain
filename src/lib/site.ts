export const SITE = {
  name: 'Atelier',
  fullName: 'L’Atelier de l’Écrivain',
  tagline: 'Parlez. Votre livre s’écrit.',
  description:
    'L’atelier d’écriture qui transforme votre voix en manuscrit : dictée en temps réel, ratures suggérées, vérification des faits sourcée, liseuse et export PDF/EPUB prêt à imprimer.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://atelier-ecrivain.vercel.app',
  host: 'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
} as const;
