'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { strToU8, zipSync } from 'fflate';
import { Download, KeyRound, LogOut, ShieldAlert, Sparkles, Upload, UserRound } from 'lucide-react';
import { useAuth, useUser } from '@/components/providers/auth-provider';
import { AppHeader } from '@/components/app/app-header';
import { Avatar } from '@/components/app/user-menu';
import { GoogleIcon } from '@/components/app/login-view';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AI_CONSENT_VERSION, type DictationEngine } from '@/lib/data/profile';
import { collectUserData, deleteAllUserData } from '@/lib/data/account';
import { deleteAuthAccount, describeAuthError, signInWithGoogle, signOutEverywhere } from '@/lib/firebase/auth';
import { personalKey } from '@/lib/ai/client';
import { compressImage, fileToDataUrl } from '@/lib/image';
import { cn, formatRelative, hardNavigate } from '@/lib/utils';

const COLORS = ['#f2542d', '#6a5cf5', '#1b8a5e', '#d4a017', '#2b6cb0', '#b83280', '#17151f'];

export function AccountView() {
  const user = useUser();
  const { profile, saveProfile, displayName } = useAuth();
  const [penName, setPenName] = useState(profile.penName);
  const [key, setKey] = useState(() => (typeof window !== 'undefined' ? personalKey.get() : ''));
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const aiOn = profile.aiConsent?.version === AI_CONSENT_VERSION;

  const exportData = async () => {
    setExporting(true);
    try {
      const { json, markdown } = await collectUserData(user.uid);
      const files: Record<string, Uint8Array> = {
        'atelier-donnees.json': strToU8(
          JSON.stringify({ account: { uid: user.uid, email: user.email, createdAt: user.metadata.creationTime }, ...json }, null, 2),
        ),
        'LISEZMOI.txt': strToU8(
          'Export complet de vos données Atelier (RGPD, art. 20).\n\n- atelier-donnees.json : profil, manuscrits, chapitres, notes, versions et statistiques.\n- manuscrits/ : chaque manuscrit en Markdown.\n',
        ),
      };
      for (const m of markdown) files[`manuscrits/${m.path}`] = strToU8(m.content);
      const zip = zipSync(files, { level: 6 });
      const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `atelier-export-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success('Export prêt');
    } catch (err) {
      console.error(err);
      toast.error('Export impossible. Vérifiez votre connexion.');
    } finally {
      setExporting(false);
    }
  };

  const destroy = async () => {
    setDeleting(true);
    try {
      await deleteAllUserData(user.uid);
      await deleteAuthAccount(user);
      personalKey.set('');
      await signOutEverywhere().catch(() => {});
      hardNavigate('/?compte=supprime');
    } catch (err) {
      toast.error(describeAuthError(err));
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-dvh pb-24">
      <AppHeader />
      <main className="container-page max-w-3xl pt-10">
        <h1 className="font-display text-5xl">Compte</h1>
        <p className="mt-2 text-sm text-muted">
          {user.isAnonymous ? 'Compte d’essai' : user.email} · membre depuis{' '}
          {user.metadata.creationTime ? formatRelative(new Date(user.metadata.creationTime).getTime()) : '—'}
        </p>

        {user.isAnonymous && (
          <Card title="Garder vos textes" icon={<UserRound />}>
            <p className="text-sm text-muted">
              Votre essai est lié à ce navigateur. Associez-le à un compte pour retrouver vos manuscrits partout.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => signInWithGoogle().catch((e) => toast.error(describeAuthError(e)))}>
                <GoogleIcon /> Continuer avec Google
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/connexion?conversion=1">Par e-mail</Link>
              </Button>
            </div>
          </Card>
        )}

        <Card title="Profil" icon={<UserRound />}>
          <div className="flex items-center gap-5">
            <Avatar size={64} />
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => void saveProfile({ avatarColor: c })}
                    className={cn('size-7 rounded-full ring-offset-2 ring-offset-surface', profile.avatarColor === c && 'ring-2 ring-text')}
                    style={{ background: c }}
                    aria-label={`Couleur ${c}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="xs" variant="secondary" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-3.5" /> Photo
                </Button>
                {profile.avatarUrl && (
                  <Button size="xs" variant="ghost" onClick={() => void saveProfile({ avatarUrl: '' })}>
                    Retirer
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const data = await compressImage(await fileToDataUrl(f), {
                        maxWidth: 160,
                        maxHeight: 160,
                        maxBytes: 40_000,
                        cover: true,
                      });
                      await saveProfile({ avatarUrl: data });
                    } catch {
                      toast.error('Image illisible.');
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <form
            className="mt-5 flex items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await saveProfile({ penName: penName.trim().slice(0, 80) });
              toast.success('Nom de plume enregistré');
            }}
          >
            <div className="flex-1">
              <Label htmlFor="pen">Nom de plume</Label>
              <Input id="pen" value={penName} onChange={(e) => setPenName(e.target.value)} placeholder={displayName} maxLength={80} />
            </div>
            <Button type="submit" variant="secondary">
              Enregistrer
            </Button>
          </form>
        </Card>

        <Card title="Écriture" icon={<Sparkles />}>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>
              <span className="block font-medium">Objectif quotidien</span>
              <span className="text-muted">Nombre de mots visé chaque jour.</span>
            </span>
            <Input
              type="number"
              min={50}
              max={20000}
              step={50}
              defaultValue={profile.dailyGoal}
              className="w-28 text-right"
              onBlur={(e) => {
                const v = Number(e.currentTarget.value);
                if (v >= 50 && v <= 20000) void saveProfile({ dailyGoal: v });
              }}
            />
          </label>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium">Moteur de dictée</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['auto', 'Automatique', 'Texte en direct, affiné par l’IA sur ordinateur.'],
                  ['browser', 'Navigateur', 'Instantané. Traité par l’éditeur du navigateur.'],
                  ['cloud', 'IA Gemini', 'Meilleure ponctuation, repentirs détectés.'],
                ] as [DictationEngine, string, string][]
              ).map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => void saveProfile({ dictationEngine: id })}
                  aria-pressed={profile.dictationEngine === id}
                  className={cn(
                    'rounded-xl border border-border p-3 text-left transition',
                    profile.dictationEngine === id && 'border-ember bg-ember-soft/40',
                  )}
                >
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card title="Assistant IA" icon={<Sparkles />} id="ia">
          <label className="flex items-start justify-between gap-4 text-sm">
            <span>
              <span className="block font-medium">Autoriser l’envoi à Google Gemini</span>
              <span className="text-muted">
                Uniquement le passage concerné, au moment où vous le demandez (dictée IA, ratures, vérification, recherche, couverture).
                {aiOn && profile.aiConsent?.acceptedAt ? ` Accordé ${formatRelative(profile.aiConsent.acceptedAt)}.` : ''}
              </span>
            </span>
            <Switch
              checked={aiOn}
              onCheckedChange={(v) =>
                void saveProfile({ aiConsent: v ? { version: AI_CONSENT_VERSION, acceptedAt: Date.now() } : null }).then(() =>
                  toast.success(v ? 'IA activée' : 'IA désactivée : plus aucun envoi.'),
                )
              }
              aria-label="Autoriser l’assistant IA"
            />
          </label>
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (key.trim() && !/^[A-Za-z0-9_\-]{20,120}$/.test(key.trim())) {
                toast.error('Cette clé ne ressemble pas à une clé Gemini (AIza…).');
                return;
              }
              personalKey.set(key);
              toast.success(key ? 'Clé enregistrée sur cet appareil' : 'Clé retirée');
            }}
          >
            <Label htmlFor="byok" className="flex items-center gap-2">
              <KeyRound className="size-3.5" /> Clé Gemini personnelle (facultatif)
            </Label>
            <div className="flex gap-2">
              <Input
                id="byok"
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="AIza…"
                className="font-mono"
              />
              <Button type="submit" variant="secondary">
                {key ? 'Enregistrer' : 'Retirer'}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-faint">
              Stockée uniquement dans ce navigateur, transmise à notre serveur à chaque requête sans être conservée. Utile pour lever le
              quota du service.
            </p>
          </form>
        </Card>

        <Card title="Mes données" icon={<Download />}>
          <p className="text-sm text-muted">
            Téléchargez tout ce que nous conservons à votre sujet : profil, manuscrits (JSON + Markdown), notes, versions et statistiques.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void exportData()} loading={exporting}>
              <Download className="size-4" /> Exporter mes données (.zip)
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/confidentialite">Politique de confidentialité</Link>
            </Button>
          </div>
        </Card>

        <Card title="Session" icon={<LogOut />}>
          <p className="text-sm text-muted">La déconnexion efface aussi la copie hors ligne de vos manuscrits sur cet appareil.</p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={async () => {
              await signOutEverywhere();
              hardNavigate('/');
            }}
          >
            <LogOut className="size-4" /> Se déconnecter
          </Button>
        </Card>

        <Card title="Supprimer mon compte" icon={<ShieldAlert />} tone="danger">
          <p className="text-sm text-muted">
            Efface définitivement vos manuscrits, notes, versions, statistiques et votre compte de connexion. Irréversible : exportez vos
            données avant.
          </p>
          <Button className="mt-4" variant="danger" onClick={() => setConfirmDelete(true)}>
            Supprimer mon compte
          </Button>
        </Card>
      </main>

      <Dialog open={confirmDelete} onOpenChange={(o) => !deleting && setConfirmDelete(o)}>
        <DialogContent title="Supprimer définitivement ?" description="Cette action ne peut pas être annulée.">
          <p className="text-sm">
            Tapez <strong>SUPPRIMER</strong> pour confirmer.
          </p>
          <Input
            className="mt-3"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            aria-label="Confirmation"
            autoComplete="off"
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="danger" disabled={confirmText !== 'SUPPRIMER'} loading={deleting} onClick={() => void destroy()}>
              Tout supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
  tone,
  id,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: 'danger';
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'mt-8 scroll-mt-24 rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6',
        tone === 'danger' && 'border-danger/30',
      )}
    >
      <h2
        className={cn(
          'mb-4 flex items-center gap-2 text-base font-semibold [&>svg]:size-4',
          tone === 'danger' ? 'text-danger' : 'text-text',
        )}
      >
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
