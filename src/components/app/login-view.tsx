'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2, Mail, MailCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Logo } from '@/components/ui/logo';
import {
  completeMagicLink,
  describeAuthError,
  isMagicLink,
  sendMagicLink,
  signInWithGoogle,
  startAnonymousTrial,
  storedMagicLinkEmail,
} from '@/lib/firebase/auth';

function safeNext(raw: string | null): string {
  // Redirection interne uniquement (anti open-redirect).
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/bibliotheque';
  return raw;
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.95l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function LoginView() {
  const { status, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('suite'));
  const converting = params.get('conversion') === '1' && user?.isAnonymous;
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<null | 'google' | 'email' | 'trial' | 'link'>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needEmail, setNeedEmail] = useState(false);

  useEffect(() => {
    if (status === 'signed-in' && user && !user.isAnonymous) router.replace(next);
    else if (status === 'signed-in' && user?.isAnonymous && !converting && busy !== 'link') router.replace(next);
  }, [status, user, next, router, converting, busy]);

  // Retour depuis le lien magique reçu par e-mail.
  useEffect(() => {
    if (status === 'loading' || status === 'unconfigured') return;
    if (params.get('lien') !== '1' || !isMagicLink(window.location.href)) return;
    const stored = storedMagicLinkEmail();
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lien ouvert sur un autre appareil : on demande l'adresse
      setNeedEmail(true);
      return;
    }
    setBusy('link');
    completeMagicLink(stored, window.location.href)
      .then(() => router.replace(next))
      .catch((err) => setError(describeAuthError(err)))
      .finally(() => setBusy(null));
  }, [status, params, router, next]);

  const run = async (kind: 'google' | 'trial', fn: () => Promise<void>) => {
    setError(null);
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(null);
    }
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy('email');
    try {
      if (needEmail) {
        await completeMagicLink(email.trim(), window.location.href);
        router.replace(next);
      } else {
        await sendMagicLink(email.trim());
        setSent(true);
      }
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* ── Panneau de marque ── */}
      <section data-theme="night" className="relative hidden overflow-hidden bg-bg text-text lg:block">
        <div className="absolute top-1/4 -left-40 size-[520px] rounded-full bg-ember/30 blur-[120px]" />
        <div className="absolute right-0 -bottom-40 size-[480px] rounded-full bg-iris/30 blur-[120px]" />
        <div className="grain absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" aria-label="Accueil">
            <Logo />
          </Link>
          <blockquote className="max-w-lg">
            <p className="font-display text-5xl leading-[1.05]">
              « Il faut écrire comme on parle, <em className="text-gradient-ember">et parler juste</em>. »
            </p>
            <footer className="mt-5 text-sm text-muted">Les mots viennent d’abord à voix haute. L’Atelier se charge de l’encre.</footer>
          </blockquote>
          <p className="text-xs text-faint">
            Chiffré en transit et au repos · Aucun cookie publicitaire · Données hébergées chez Google Cloud
          </p>
        </div>
      </section>

      {/* ── Formulaire ── */}
      <main className="flex items-center justify-center bg-surface px-6 py-12 text-text">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="font-display text-4xl leading-tight">
            {converting ? 'Gardez vos textes' : needEmail ? 'Confirmez votre adresse' : 'Entrer dans l’Atelier'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {converting
              ? 'Associez votre essai à un compte : vos manuscrits vous suivront sur tous vos appareils.'
              : 'Gratuit, sans carte bancaire. Vos manuscrits restent les vôtres.'}
          </p>

          {busy === 'link' ? (
            <p className="mt-10 flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" /> Connexion en cours…
            </p>
          ) : sent ? (
            <div className="mt-8 rounded-2xl border border-sage/30 bg-sage-soft p-5" role="status">
              <MailCheck className="size-6 text-sage" />
              <p className="mt-3 font-medium">Vérifiez votre boîte mail</p>
              <p className="mt-1 text-sm text-muted">
                Un lien de connexion a été envoyé à <strong>{email}</strong>. Il est valable une heure et ne sert qu’une fois.
              </p>
              <button type="button" onClick={() => setSent(false)} className="mt-3 text-sm text-ember underline underline-offset-4">
                Utiliser une autre adresse
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              {!needEmail && (
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={() => void run('google', signInWithGoogle)}
                  loading={busy === 'google'}
                  disabled={!!busy}
                >
                  {busy !== 'google' && <GoogleIcon />} Continuer avec Google
                </Button>
              )}

              {!needEmail && (
                <div className="flex items-center gap-3 text-xs text-faint">
                  <span className="h-px flex-1 bg-border" /> ou par e-mail, sans mot de passe <span className="h-px flex-1 bg-border" />
                </div>
              )}

              <form onSubmit={submitEmail} className="space-y-3">
                <label htmlFor="email" className="sr-only">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.fr"
                    className="h-12 pl-9"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" loading={busy === 'email'} disabled={!!busy || !email.includes('@')}>
                  {needEmail ? 'Confirmer' : 'Recevoir un lien de connexion'} {busy !== 'email' && <ArrowRight className="size-4" />}
                </Button>
              </form>

              {!converting && !needEmail && (
                <button
                  type="button"
                  onClick={() => void run('trial', startAnonymousTrial)}
                  disabled={!!busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm text-muted transition hover:bg-surface-2 hover:text-text"
                >
                  {busy === 'trial' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-iris" />}
                  Essayer sans compte
                </button>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="mt-5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <p className="mt-10 text-xs leading-relaxed text-faint">
            En continuant, vous acceptez les{' '}
            <Link href="/conditions" className="underline underline-offset-2 hover:text-muted">
              conditions d’utilisation
            </Link>{' '}
            et la{' '}
            <Link href="/confidentialite" className="underline underline-offset-2 hover:text-muted">
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
