import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ReelsStudio } from '@/components/marketing/reels-studio';

export const metadata: Metadata = {
  title: 'Studio vidéo',
  description: 'Démonstrations verticales 9:16 de l’Atelier, prêtes pour TikTok, Reels et Shorts.',
  robots: { index: false },
};

export default function ReelsPage() {
  return (
    <Suspense>
      <ReelsStudio />
    </Suspense>
  );
}
