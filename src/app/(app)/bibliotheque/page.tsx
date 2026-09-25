'use client';

import { Suspense } from 'react';
import { RequireAuth, FullPageLoader } from '@/components/app/require-auth';
import { LibraryView } from '@/components/library/library-view';

export default function BibliothequePage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <RequireAuth>
        <LibraryView />
      </RequireAuth>
    </Suspense>
  );
}
