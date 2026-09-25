'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BookOpen, Flame, Mic, MoreHorizontal, PenLine, Plus, Target, Trash2, Upload, Feather, UserRoundPlus } from 'lucide-react';
import { useAuth, useUser } from '@/components/providers/auth-provider';
import { useWritingStats } from '@/components/app/use-stats';
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/field';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState, ProgressRing } from '@/components/ui/misc';
import { BookCover } from '@/components/manuscript/book-cover';
import { createManuscript, deleteManuscript, MANUSCRIPT_ACCENTS, subscribeManuscripts, updateManuscript } from '@/lib/data/manuscripts';
import type { Manuscript } from '@/lib/doc/types';
import { importText } from '@/lib/import';
import { TEMPLATES } from '@/lib/templates';
import { cn, formatNumber, formatRelative } from '@/lib/utils';
import { ActivityChart } from './activity-chart';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Belle nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bel après-midi';
  return 'Bonsoir';
}

function coverFor(m: Manuscript) {
  const accent = m.accent ?? MANUSCRIPT_ACCENTS[0];
  return `linear-gradient(160deg, color-mix(in oklab, ${accent} 35%, #0b0b10) 0%, ${accent} 120%)`;
}

export function LibraryView() {
  const user = useUser();
  const { displayName, profile } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<Manuscript[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Manuscript | null>(null);
  const [goalFor, setGoalFor] = useState<Manuscript | null>(null);
  const [deleting, setDeleting] = useState<Manuscript | null>(null);
  const { stats, today, streak } = useWritingStats(user.uid, 30);

  useEffect(() => subscribeManuscripts(user.uid, setList, () => setList([])), [user.uid]);

  const last = useMemo(() => list?.find((m) => m.id === profile.lastManuscriptId) ?? list?.[0], [list, profile.lastManuscriptId]);
  const month = stats.reduce((s, d) => s + d.words, 0);

  return (
    <div className="min-h-dvh pb-24">
      <AppHeader />
      <main className="container-page pt-10 sm:pt-14">
        {user.isAnonymous && (
          <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-iris/30 bg-iris-soft/50 p-4 sm:flex-row sm:items-center">
            <UserRoundPlus className="size-5 shrink-0 text-iris" />
            <p className="flex-1 text-sm">
              <strong>Compte d’essai.</strong> Vos textes sont enregistrés, mais liés à ce navigateur. Créez un compte pour les retrouver
              partout.
            </p>
            <Button size="sm" variant="ai" asChild>
              <Link href="/connexion?conversion=1">Garder mes textes</Link>
            </Button>
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-faint uppercase">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="mt-3 font-display text-[clamp(2.4rem,6vw,4rem)] leading-[1.02] tracking-[-0.015em]">
              {greeting()}, <em className="text-ember">{displayName}</em>.
            </h1>

            {list === null ? (
              <div className="mt-8 flex gap-6">
                <div className="aspect-[2/3] w-36 skeleton" />
                <div className="flex-1 space-y-3 pt-4">
                  <div className="h-7 w-2/3 skeleton" />
                  <div className="h-4 w-1/2 skeleton" />
                </div>
              </div>
            ) : last ? (
              <article className="mt-8 flex flex-col gap-6 rounded-3xl border border-border bg-surface p-5 shadow-soft sm:flex-row sm:items-center sm:p-6">
                <Link
                  href={`/atelier?m=${last.id}`}
                  className="mx-auto w-32 shrink-0 [transform:perspective(800px)_rotateY(-16deg)] transition-transform duration-500 hover:[transform:perspective(800px)_rotateY(0)] sm:mx-0"
                  aria-label={`Ouvrir ${last.title}`}
                >
                  <BookCover title={last.title} subtitle={last.subtitle} author={displayName} background={coverFor(last)} volume />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium tracking-wider text-ember uppercase">Reprendre</p>
                  <h2 className="mt-1 truncate font-display text-3xl">{last.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {formatNumber(last.wordCount)} mots · {last.chapterCount} chapitre{last.chapterCount > 1 ? 's' : ''} · modifié{' '}
                    {formatRelative(last.updatedAt)}
                  </p>
                  {last.goal?.targetWords ? (
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full bg-ember"
                          style={{ width: `${Math.min(100, (last.wordCount / last.goal.targetWords) * 100)}%` }}
                        />
                      </div>
                      {Math.round((last.wordCount / last.goal.targetWords) * 100)} % de {formatNumber(last.goal.targetWords)}
                    </div>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href={`/atelier?m=${last.id}`}>
                        <PenLine className="size-4" /> Écrire
                      </Link>
                    </Button>
                    <Button variant="secondary" asChild>
                      <Link href={`/atelier?m=${last.id}&action=dicter`}>
                        <Mic className="size-4" /> Dicter
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild>
                      <Link href={`/liseuse?m=${last.id}`}>
                        <BookOpen className="size-4" /> Relire
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ) : (
              <div className="mt-8 rounded-3xl border border-dashed border-border-strong p-8 text-center">
                <Feather className="mx-auto size-8 text-ember" />
                <h2 className="mt-3 font-display text-3xl">Votre premier livre commence ici</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                  Partez d’une page blanche, d’une structure, ou importez un texte existant.
                </p>
                <Button className="mt-5" size="lg" onClick={() => setCreating(true)}>
                  <Plus className="size-4" /> Nouveau manuscrit
                </Button>
              </div>
            )}
          </div>

          {/* ── Activité ── */}
          <aside className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Aujourd’hui" value={formatNumber(today)} hint={`/ ${formatNumber(profile.dailyGoal)}`}>
                <ProgressRing value={today / profile.dailyGoal} size={22} stroke={3} label="Objectif du jour" />
              </Stat>
              <Stat label="Série" value={String(streak)} hint={streak > 1 ? 'jours' : 'jour'}>
                <Flame className={cn('size-4', streak > 0 ? 'text-ember' : 'text-faint')} />
              </Stat>
              <Stat label="30 jours" value={formatNumber(month)} hint="mots">
                <Target className="size-4 text-faint" />
              </Stat>
            </div>
            <h2 className="mt-6 mb-3 text-xs font-medium text-muted">Mots écrits par jour</h2>
            <ActivityChart stats={stats} />
          </aside>
        </section>

        {/* ── Tous les manuscrits ── */}
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl">Bibliothèque</h2>
            <Button onClick={() => setCreating(true)} variant="secondary">
              <Plus className="size-4" /> Nouveau
            </Button>
          </div>
          {list && list.length === 0 && (
            <EmptyState icon={<BookOpen />} title="Aucun manuscrit" className="rounded-3xl border border-dashed border-border">
              Vos livres apparaîtront ici.
            </EmptyState>
          )}
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {list?.map((m) => (
              <li key={m.id} className="group relative">
                <Link href={`/atelier?m=${m.id}`} className="block transition duration-300 group-hover:-translate-y-1">
                  <BookCover title={m.title} subtitle={m.subtitle} author={displayName} background={coverFor(m)} volume />
                </Link>
                <div className="mt-3 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-faint">
                      {formatNumber(m.wordCount)} mots · {formatRelative(m.updatedAt)}
                    </p>
                  </div>
                  <Menu>
                    <MenuTrigger asChild>
                      <button
                        type="button"
                        className="grid size-7 place-items-center rounded-md text-faint hover:bg-surface-2 hover:text-text"
                        aria-label={`Actions pour ${m.title}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </MenuTrigger>
                    <MenuContent>
                      <MenuItem icon={<BookOpen />} href={`/liseuse?m=${m.id}`}>
                        Lire
                      </MenuItem>
                      <MenuItem icon={<PenLine />} onSelect={() => setRenaming(m)}>
                        Renommer
                      </MenuItem>
                      <MenuItem icon={<Target />} onSelect={() => setGoalFor(m)}>
                        Objectif de longueur
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem icon={<Trash2 />} tone="danger" onSelect={() => setDeleting(m)}>
                        Supprimer
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <NewManuscriptDialog
        open={creating}
        onOpenChange={setCreating}
        onCreate={async (input) => {
          const id = await createManuscript(user.uid, input);
          router.push(`/atelier?m=${id}`);
        }}
      />

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        {renaming && (
          <DialogContent title="Renommer le manuscrit">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await updateManuscript(user.uid, renaming.id, {
                  title: String(f.get('title') ?? '').trim() || 'Sans titre',
                  subtitle: String(f.get('subtitle') ?? '').trim(),
                });
                setRenaming(null);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="rn-title">Titre</Label>
                <Input id="rn-title" name="title" defaultValue={renaming.title} maxLength={200} required />
              </div>
              <div>
                <Label htmlFor="rn-sub">Sous-titre</Label>
                <Input id="rn-sub" name="subtitle" defaultValue={renaming.subtitle ?? ''} maxLength={300} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setRenaming(null)}>
                  Annuler
                </Button>
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!goalFor} onOpenChange={(o) => !o && setGoalFor(null)}>
        {goalFor && (
          <DialogContent
            title="Objectif de longueur"
            description="Un roman fait souvent entre 60 000 et 100 000 mots ; une novella, 20 000 à 40 000."
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const v = Number(new FormData(e.currentTarget).get('target'));
                await updateManuscript(user.uid, goalFor.id, { goal: v > 0 ? { targetWords: Math.min(2_000_000, v) } : null });
                setGoalFor(null);
                toast.success('Objectif enregistré');
              }}
              className="space-y-4"
            >
              <div className="flex flex-wrap gap-2">
                {[20_000, 50_000, 80_000, 100_000].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={(e) => {
                      const input = e.currentTarget.form?.elements.namedItem('target') as HTMLInputElement | null;
                      if (input) input.value = String(n);
                    }}
                    className="h-8 rounded-full border border-border px-3 text-xs hover:border-border-strong"
                  >
                    {formatNumber(n)}
                  </button>
                ))}
              </div>
              <Input
                name="target"
                type="number"
                min={0}
                step={1000}
                defaultValue={goalFor.goal?.targetWords ?? 50_000}
                aria-label="Nombre de mots visé"
              />
              <div className="flex justify-end gap-2">
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        {deleting && (
          <DialogContent
            title="Supprimer ce manuscrit ?"
            description="Tous ses chapitres, notes et versions seront définitivement effacés."
          >
            <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              « {deleting.title} » — {formatNumber(deleting.wordCount)} mots. Pensez à l’exporter avant.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  const target = deleting;
                  setDeleting(null);
                  await deleteManuscript(user.uid, target.id);
                  toast.success('Manuscrit supprimé');
                }}
              >
                Supprimer définitivement
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Stat({ label, value, hint, children }: { label: string; value: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted">
        {label}
        {children}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-[11px] text-faint">{hint}</p>
    </div>
  );
}

function NewManuscriptDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (input: Parameters<typeof createManuscript>[1]) => Promise<void>;
}) {
  const [template, setTemplate] = useState('blank');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<{ name: string; chapters: ReturnType<typeof importText> } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const t = TEMPLATES.find((x) => x.id === template) ?? TEMPLATES[0];
      await onCreate({
        title: title.trim() || (imported ? imported.name : t.id === 'guide' ? 'Visite guidée' : 'Sans titre'),
        chapters: imported?.chapters ?? t.chapters,
      });
      onOpenChange(false);
      setTitle('');
      setImported(null);
    } catch {
      toast.error('Création impossible. Vérifiez votre connexion.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Nouveau manuscrit">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label htmlFor="nm-title">Titre (provisoire, bien sûr)</Label>
            <Input id="nm-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Le roman de l’été" maxLength={200} />
          </div>
          <div>
            <Label>Point de départ</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTemplate(t.id);
                    setImported(null);
                  }}
                  aria-pressed={template === t.id && !imported}
                  className={cn(
                    'rounded-xl border border-border p-3 text-left transition hover:border-border-strong',
                    template === t.id && !imported && 'border-ember bg-ember-soft/40',
                  )}
                >
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block text-xs text-muted">{t.description}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-dashed border-border-strong p-3 text-left transition hover:bg-surface-2',
                  imported && 'border-ember bg-ember-soft/40',
                )}
              >
                <Upload className="size-4 shrink-0 text-muted" />
                <span>
                  <span className="block text-sm font-medium">{imported ? imported.name : 'Importer un texte'}</span>
                  <span className="block text-xs text-muted">
                    {imported ? `${imported.chapters.length} chapitre(s) détecté(s)` : '.txt ou .md — découpé par chapitres'}
                  </span>
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 5_000_000) return toast.error('Fichier trop volumineux (5 Mo max).');
                  const name = f.name.replace(/\.[^.]+$/, '');
                  setImported({ name, chapters: importText(await f.text()) });
                  if (!title) setTitle(name);
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={busy}>
              Créer et écrire
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
