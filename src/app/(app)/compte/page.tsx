'use client';

import { Suspense } from 'react';
import { RequireAuth, FullPageLoader } from '@/components/app/require-auth';
import { AccountView } from '@/components/account/account-view';

export default function ComptePage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <RequireAuth>
        <AccountView />
      </RequireAuth>
    </Suspense>
  );
}
