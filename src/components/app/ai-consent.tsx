'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Cpu, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { AI_CONSENT_VERSION } from '@/lib/data/profile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AiGate {
  allowed: boolean;
  /** Demande le consentement si besoin ; résout à true si l'IA peut être utilisée. */
  ensure: () => Promise<boolean>;
}

const Ctx = createContext<AiGate>({ allowed: false, ensure: async () => false });
export const useAiGate = () => useContext(Ctx);

/**
 * Consentement explicite (RGPD art. 6-1-a / 7) avant tout envoi de texte ou
 * d'audio au fournisseur d'IA. Révocable à tout moment dans Compte › IA.
 */
export function AiConsentProvider({ children }: { children: ReactNode }) {
  const { profile, saveProfile } = useAuth();
  const allowed = profile.aiConsent?.version === AI_CONSENT_VERSION;
  const [open, setOpen] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const ensure = useCallback(() => {
    if (allowed) return Promise.resolve(true);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, [allowed]);

  const close = (ok: boolean) => {
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  return (
    <Ctx.Provider value={{ allowed, ensure }}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !o && close(false)}>
        <DialogContent title="Activer l’assistant IA ?" description="Une fois, en toute transparence.">
          <ul className="space-y-4 text-[14px] leading-relaxed">
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-iris" />
              <span>
                Pour transcrire une dictée, proposer des ratures, vérifier un fait ou chercher une source, le passage concerné (texte ou
                audio) est envoyé à <strong>Google Gemini</strong> via notre serveur, uniquement au moment où vous le demandez.
              </span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sage" />
              <span>
                Nous ne conservons ni l’audio ni les requêtes. Vos manuscrits restent les vôtres : ils ne sont ni vendus, ni partagés, ni
                utilisés pour entraîner nos outils.
              </span>
            </li>
            <li className="flex gap-3">
              <Cpu className="mt-0.5 size-5 shrink-0 text-muted" />
              <span>
                Sans IA, l’atelier reste entièrement utilisable : écriture, notes, versions, liseuse, export. La dictée directe du
                navigateur peut, selon celui-ci, être traitée par son éditeur (Google, Apple).
              </span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted">
            Consentement révocable à tout moment dans Compte › IA.{' '}
            <Link href="/confidentialite#ia" className="underline underline-offset-2" target="_blank">
              En savoir plus
            </Link>
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => close(false)}>
              Pas maintenant
            </Button>
            <Button
              variant="ai"
              onClick={async () => {
                await saveProfile({ aiConsent: { version: AI_CONSENT_VERSION, acceptedAt: Date.now() } });
                close(true);
              }}
            >
              <Sparkles className="size-4" /> Activer l’IA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
