'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { AiConsentProvider } from './ai-consent';
import { LogoMark } from '@/components/ui/logo';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (status === 'signed-out') {
      const next = `${pathname}${params.size ? `?${params.toString()}` : ''}`;
      router.replace(`/connexion?suite=${encodeURIComponent(next)}`);
    }
  }, [status, router, pathname, params]);

  if (status === 'unconfigured') return <ConfigMissing />;
  if (status !== 'signed-in') return <FullPageLoader />;
  return <AiConsentProvider>{children}</AiConsentProvider>;
}

export function FullPageLoader({ label = 'Ouverture de l’atelier…' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="size-10 animate-pulse" />
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

function ConfigMissing() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <LogoMark className="mx-auto mb-5 size-12" />
        <h1 className="font-display text-3xl">Configuration Firebase requise</h1>
        <p className="mt-3 text-sm text-muted">
          Renseignez les variables <code className="rounded bg-surface-2 px-1">NEXT_PUBLIC_FIREBASE_*</code> (voir
          <code className="rounded bg-surface-2 px-1">.env.example</code>) puis relancez l’application.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-ember underline underline-offset-4">
          Retour à l’accueil
        </Link>
      </div>
    </div>
  );
}
