'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAuth, FullPageLoader } from '@/components/app/require-auth';
import { AtelierApp } from '@/components/atelier/atelier-app';
import { useAuth } from '@/components/providers/auth-provider';

function AtelierRoute() {
  const params = useSearchParams();
  const router = useRouter();
  const { profile, profileReady } = useAuth();
  const mid = params.get('m');

  useEffect(() => {
    if (mid || !profileReady) return;
    router.replace(profile.lastManuscriptId ? `/atelier?m=${profile.lastManuscriptId}` : '/bibliotheque');
  }, [mid, profileReady, profile.lastManuscriptId, router]);

  if (!mid) return <FullPageLoader />;
  return <AtelierApp key={mid} mid={mid} />;
}

export default function AtelierPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <RequireAuth>
        <AtelierRoute />
      </RequireAuth>
    </Suspense>
  );
}
