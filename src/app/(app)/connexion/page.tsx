'use client';

import { Suspense } from 'react';
import { LoginView } from '@/components/app/login-view';
import { FullPageLoader } from '@/components/app/require-auth';

export default function ConnexionPage() {
  return (
    <Suspense fallback={<FullPageLoader label="Chargement…" />}>
      <LoginView />
    </Suspense>
  );
}
