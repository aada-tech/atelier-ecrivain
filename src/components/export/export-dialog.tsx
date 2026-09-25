'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BookOpenText, Download, FileText, ImagePlus, Loader2, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useAiGate } from '@/components/app/ai-consent';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { BookCover } from '@/components/manuscript/book-cover';
import { ai, AiRequestError } from '@/lib/ai/client';
import { loadBookMeta, saveBookMeta, MAX_COVER_BYTES } from '@/lib/data/book';
import type { Chapter, Manuscript } from '@/lib/doc/types';
import { chapterToMarkdown } from '@/lib/doc/text';
import { buildEpub } from '@/lib/export/epub';
import { compressImage, fileToDataUrl } from '@/lib/image';
import { slugify } from '@/lib/data/account';
import { cn, createId } from '@/lib/utils';
import type { BookMetadata, CoverConfig, FrontBackMatterSection } from '@/features/export/types/bookMeta';
import type { ExportSettings, PageFormat, ThemeId } from '@/features/export/types/exportSettings';
import { THEME_REGISTRY } from '@/features/export/themes/registry';
import { COVER_PALETTES, DEFAULT_COVER, DEFAULT_EXPORT_SETTINGS, defaultMetadata } from '@/features/export/defaults';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  uid: string;
  manuscript: Manuscript;
  chapters: Chapter[];
}

type Format = 'pdf' | 'epub' | 'md';
type Section = 'book' | 'cover' | 'layout';

const FORMATS: { id: PageFormat; label: string; hint: string }[] = [
  { id: 'A5', label: 'A5', hint: '14,8 × 21 cm · roman' },
  { id: '6x9in', label: '6 × 9 po', hint: 'KDP / impression à la demande' },
  { id: 'pocket', label: 'Poche', hint: '11 × 18 cm' },
  { id: 'A4', label: 'A4', hint: 'manuscrit, relecture' },
];

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function ExportDialog({ open, onOpenChange, uid, manuscript, chapters }: Props) {
  const { displayName } = useAuth();
  const gate = useAiGate();
  const [format, setFormat] = useState<Format>('pdf');
  const [section, setSection] = useState<Section>('book');
  const [loaded, setLoaded] = useState(false);
  const [meta, setMeta] = useState<BookMetadata>(defaultMetadata(manuscript.title, displayName));
  const [cover, setCover] = useState<CoverConfig>(DEFAULT_COVER);
  const [sections, setSections] = useState<FrontBackMatterSection[]>([]);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [busy, setBusy] = useState<null | 'pdf' | 'epub' | 'cover'>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState<'editorial' | 'illustration' | 'photo' | 'minimal' | 'vintage'>('editorial');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadBookMeta(uid, manuscript.id)
      .then((m) => {
        if (cancelled) return;
        if (m) {
          setMeta({ ...defaultMetadata(manuscript.title, displayName), ...m.metadata } as BookMetadata);
          setCover({ ...DEFAULT_COVER, ...m.cover });
          setSections(m.sections);
          if (m.settings)
            setSettings({ ...DEFAULT_EXPORT_SETTINGS, ...m.settings, page: { ...DEFAULT_EXPORT_SETTINGS.page, ...m.settings.page } });
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [uid, manuscript.id, manuscript.title, displayName]);

  // Sauvegarde différée des réglages du livre (synchronisés entre appareils).
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveBookMeta(uid, manuscript.id, { metadata: meta, cover, sections, settings }).catch(() => {});
    }, 1_000);
  }, [loaded, uid, manuscript.id, meta, cover, sections, settings]);

  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );

  const words = useMemo(() => chapters.reduce((s, c) => s + c.wordCount, 0), [chapters]);
  const fileBase = slugify(meta.title) || 'manuscrit';

  const makePdf = async () => {
    setBusy('pdf');
    try {
      const { generatePdf } = await import('@/features/export/services/generatePdf');
      // Un échec interne du moteur de mise en page peut laisser la promesse en suspens : délai de garde.
      const blob = await Promise.race([
        generatePdf(chapters, meta, cover, settings, sections),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Génération du PDF trop longue')), 180_000)),
      ]);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
      download(blob, `${fileBase}.pdf`);
      toast.success('PDF prêt', { description: `${chapters.length} chapitres · ${words.toLocaleString('fr-FR')} mots` });
    } catch (err) {
      console.error(err);
      toast.error('La génération du PDF a échoué.');
    } finally {
      setBusy(null);
    }
  };

  const makeEpub = async () => {
    setBusy('epub');
    try {
      let coverDataUrl = cover.mode !== 'none' ? cover.imageUrl : undefined;
      if (cover.mode !== 'none' && !coverDataUrl?.startsWith('data:image/')) {
        const { renderCoverJpeg } = await import('@/lib/export/cover-canvas');
        coverDataUrl = await renderCoverJpeg(cover, meta);
      }
      const bytes = buildEpub(chapters, {
        title: meta.title,
        author: meta.penName || meta.authorName,
        subtitle: meta.subtitle,
        description: meta.backCoverBlurb,
        coverDataUrl,
      });
      download(new Blob([bytes as BlobPart], { type: 'application/epub+zip' }), `${fileBase}.epub`);
      toast.success('EPUB prêt', { description: 'Compatible Kobo, Apple Livres et Kindle (Send to Kindle).' });
    } catch (err) {
      console.error(err);
      toast.error('La génération de l’EPUB a échoué.');
    } finally {
      setBusy(null);
    }
  };

  const makeMarkdown = () => {
    const md = [`# ${meta.title}`, meta.subtitle ? `_${meta.subtitle}_` : '', `${meta.penName || meta.authorName}`, '']
      .filter((l) => l !== undefined)
      .join('\n\n');
    const body = chapters.map((c) => chapterToMarkdown(c.title, c.doc, c.notes).replace(/^# /, '## ')).join('\n\n');
    download(new Blob([`${md}\n\n${body}`], { type: 'text/markdown;charset=utf-8' }), `${fileBase}.md`);
    toast.success('Markdown exporté');
  };

  const importCover = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Choisissez une image.');
    try {
      const data = await compressImage(await fileToDataUrl(file), {
        maxWidth: 1200,
        maxHeight: 1800,
        maxBytes: MAX_COVER_BYTES,
        cover: true,
      });
      setCover((c) => ({ ...c, mode: 'imported', imageUrl: data }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image illisible.');
    }
  };

  const generateCover = async () => {
    if (!aiPrompt.trim()) return toast.message('Décrivez l’ambiance de votre livre.');
    if (!(await gate.ensure())) return;
    setBusy('cover');
    try {
      const res = await ai.cover({ prompt: aiPrompt.trim(), title: meta.title, style: aiStyle });
      const data = await compressImage(res.dataUrl, { maxWidth: 1200, maxHeight: 1800, maxBytes: MAX_COVER_BYTES, cover: true });
      setCover((c) => ({ ...c, mode: 'generated', imageUrl: data, aiGeneration: { prompt: aiPrompt.trim(), style: aiStyle } }));
    } catch (err) {
      toast.error(err instanceof AiRequestError ? err.message : 'Génération impossible.');
    } finally {
      setBusy(null);
    }
  };

  const setPage = (patch: Partial<ExportSettings['page']>) => setSettings((s) => ({ ...s, page: { ...s.page, ...patch } }));
  const theme = THEME_REGISTRY[settings.themeId];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Exporter le livre"
        description={`${chapters.length} chapitre${chapters.length > 1 ? 's' : ''} · ${words.toLocaleString('fr-FR')} mots`}
        className="max-h-[min(92dvh,900px)] w-[min(96vw,1040px)]"
      >
        <div className="mb-5 grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-1">
          {(
            [
              ['pdf', 'Livre PDF', <BookOpenText key="p" />],
              ['epub', 'Liseuse EPUB', <Sparkles key="e" />],
              ['md', 'Markdown', <FileText key="m" />],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFormat(id)}
              aria-pressed={format === id}
              className={cn(
                'flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium text-muted transition [&>svg]:size-4',
                format === id && 'bg-surface text-text shadow-soft',
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {format === 'md' ? (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted">
              Texte brut balisé, idéal pour un correcteur, Pandoc ou un dépôt Git. Notes de bas de page incluses.
            </p>
            <Button className="mt-4" onClick={makeMarkdown}>
              <Download className="size-4" /> Télécharger le .md
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="mb-4 flex gap-1 border-b border-border">
                {(
                  [['book', 'Le livre'], ['cover', 'Couverture'], ...(format === 'pdf' ? [['layout', 'Mise en page']] : [])] as [
                    Section,
                    string,
                  ][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSection(id)}
                    className={cn(
                      '-mb-px border-b-2 border-transparent px-3 pb-2.5 text-sm font-medium text-muted transition hover:text-text',
                      section === id && 'border-ember text-text',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {section === 'book' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Titre">
                    <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} maxLength={200} />
                  </Field>
                  <Field label="Sous-titre">
                    <Input value={meta.subtitle ?? ''} onChange={(e) => setMeta({ ...meta, subtitle: e.target.value })} maxLength={300} />
                  </Field>
                  <Field label="Auteur·rice (nom de plume)">
                    <Input
                      value={meta.penName || meta.authorName}
                      onChange={(e) => setMeta({ ...meta, penName: e.target.value, authorName: e.target.value })}
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Dédicace" className="sm:col-span-2">
                    <Textarea
                      value={meta.dedication ?? ''}
                      onChange={(e) => setMeta({ ...meta, dedication: e.target.value })}
                      rows={2}
                      className="min-h-0"
                      maxLength={1000}
                    />
                  </Field>
                  <Field label="Épigraphe" className="sm:col-span-2">
                    <Textarea
                      value={meta.epigraph ?? ''}
                      onChange={(e) => setMeta({ ...meta, epigraph: e.target.value })}
                      rows={2}
                      className="min-h-0"
                      maxLength={1000}
                    />
                  </Field>
                  <Field label="Quatrième de couverture" className="sm:col-span-2">
                    <Textarea
                      value={meta.backCoverBlurb ?? ''}
                      onChange={(e) => setMeta({ ...meta, backCoverBlurb: e.target.value })}
                      rows={4}
                      maxLength={2500}
                    />
                  </Field>
                  {format === 'pdf' && (
                    <div className="sm:col-span-2">
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="mb-0">Pages liminaires & annexes</Label>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            setSections([
                              ...sections,
                              {
                                id: createId('sec'),
                                placement: 'front',
                                kind: 'preface',
                                title: 'Préface',
                                content: '',
                                order: sections.length,
                              },
                            ])
                          }
                        >
                          <Plus className="size-3.5" /> Ajouter
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {sections.map((s, i) => (
                          <div key={s.id} className="rounded-xl border border-border p-3">
                            <div className="flex gap-2">
                              <Input
                                value={s.title}
                                onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                                className="h-9"
                                aria-label="Titre de la section"
                              />
                              <select
                                value={s.placement}
                                onChange={(e) =>
                                  setSections(
                                    sections.map((x, j) => (j === i ? { ...x, placement: e.target.value as 'front' | 'back' } : x)),
                                  )
                                }
                                className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
                                aria-label="Emplacement"
                              >
                                <option value="front">Avant</option>
                                <option value="back">Après</option>
                              </select>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => setSections(sections.filter((_, j) => j !== i))}
                                aria-label="Supprimer la section"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                            <Textarea
                              value={s.content}
                              onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))}
                              className="mt-2"
                              rows={3}
                              placeholder="Texte (une ligne vide sépare les paragraphes)"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {section === 'cover' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        ['generated', 'Couleur'],
                        ['imported', 'Image'],
                        ['ai', 'Illustration IA'],
                        ['none', 'Aucune'],
                      ] as const
                    ).map(([id, label]) => {
                      const activeMode =
                        id === 'ai'
                          ? cover.mode === 'generated' && !!cover.imageUrl
                          : id === 'generated'
                            ? cover.mode === 'generated' && !cover.imageUrl
                            : cover.mode === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            if (id === 'imported') fileRef.current?.click();
                            else if (id === 'generated') setCover((c) => ({ ...c, mode: 'generated', imageUrl: undefined }));
                            else if (id === 'none') setCover((c) => ({ ...c, mode: 'none' }));
                            else setCover((c) => ({ ...c, mode: 'generated' }));
                          }}
                          className={cn(
                            'h-10 rounded-lg border border-border text-[13px] font-medium text-muted transition hover:border-border-strong',
                            activeMode && 'border-ember bg-ember-soft text-ember',
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && void importCover(e.target.files[0])}
                    />
                  </div>

                  <div>
                    <Label>Fond</Label>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                      {COVER_PALETTES.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          title={p.name}
                          aria-label={`Fond ${p.name}`}
                          onClick={() =>
                            setCover((c) => ({
                              ...c,
                              mode: 'generated',
                              imageUrl: undefined,
                              background: { type: p.value.startsWith('linear') ? 'gradient' : 'color', value: p.value },
                              titleColor: p.text,
                            }))
                          }
                          className={cn(
                            'aspect-[2/3] rounded-md ring-offset-2 ring-offset-surface transition hover:scale-105',
                            cover.background?.value === p.value && !cover.imageUrl && 'ring-2 ring-ember',
                          )}
                          style={{ background: p.value }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-iris/30 bg-iris-soft/40 p-4">
                    <Label className="flex items-center gap-2 text-iris">
                      <Wand2 className="size-4" /> Illustration générée par IA
                    </Label>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={2}
                      className="min-h-0 bg-surface"
                      placeholder="Ex. : un phare dans la brume, une silhouette sur le quai, lumière d’aube"
                      maxLength={600}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {(['editorial', 'illustration', 'photo', 'minimal', 'vintage'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setAiStyle(s)}
                          className={cn(
                            'h-7 rounded-full border border-border bg-surface px-3 text-xs text-muted capitalize',
                            aiStyle === s && 'border-iris text-iris',
                          )}
                        >
                          {
                            {
                              editorial: 'éditorial',
                              illustration: 'illustration',
                              photo: 'photo',
                              minimal: 'minimal',
                              vintage: 'vintage',
                            }[s]
                          }
                        </button>
                      ))}
                      <Button size="sm" variant="ai" className="ml-auto" onClick={() => void generateCover()} loading={busy === 'cover'}>
                        <Sparkles className="size-3.5" /> Générer
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-3 text-sm">
                      <input
                        type="color"
                        value={cover.titleColor ?? '#ffffff'}
                        onChange={(e) => setCover((c) => ({ ...c, titleColor: e.target.value }))}
                        className="size-8 cursor-pointer rounded border border-border bg-transparent"
                      />
                      Couleur du titre
                    </label>
                    <label className="flex items-center gap-3 text-sm">
                      <Switch checked={!cover.hideTextOverlay} onCheckedChange={(v) => setCover((c) => ({ ...c, hideTextOverlay: !v }))} />
                      Titre sur la couverture
                    </label>
                    {cover.imageUrl && (
                      <Button size="sm" variant="ghost" onClick={() => setCover((c) => ({ ...c, imageUrl: undefined, mode: 'generated' }))}>
                        <ImagePlus className="size-4" /> Retirer l’image
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {section === 'layout' && format === 'pdf' && (
                <div className="space-y-6">
                  <div>
                    <Label>Style éditorial</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {(Object.keys(THEME_REGISTRY) as ThemeId[]).map((id) => {
                        const t = THEME_REGISTRY[id];
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSettings((s) => ({ ...s, themeId: id }))}
                            className={cn(
                              'rounded-xl border border-border p-2.5 text-left transition hover:border-border-strong',
                              settings.themeId === id && 'border-ember ring-4 ring-ember/10',
                            )}
                          >
                            <span
                              className={cn(
                                'block text-lg leading-none',
                                t.fonts.heading.startsWith('serif')
                                  ? 'font-serif'
                                  : t.fonts.heading.startsWith('mono')
                                    ? 'font-mono'
                                    : 'font-sans',
                              )}
                              style={{ color: t.colors.accent }}
                            >
                              Aa {t.ornamentGlyph ?? ''}
                            </span>
                            <span className="mt-1.5 block truncate text-[11.5px] text-muted">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label>Format</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {FORMATS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setPage({ format: f.id })}
                          className={cn(
                            'rounded-xl border border-border p-2.5 text-left',
                            settings.page.format === f.id && 'border-ember bg-ember-soft/50',
                          )}
                        >
                          <span className="block text-sm font-semibold">{f.label}</span>
                          <span className="block text-[11px] text-muted">{f.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <RangeField
                      label="Corps du texte"
                      value={settings.page.fontSizePt}
                      unit="pt"
                      min={9}
                      max={14}
                      step={0.5}
                      onChange={(v) => setPage({ fontSizePt: v })}
                    />
                    <RangeField
                      label="Interlignage"
                      value={settings.page.lineHeight}
                      min={1.2}
                      max={1.9}
                      step={0.05}
                      onChange={(v) => setPage({ lineHeight: Math.round(v * 100) / 100 })}
                    />
                    <RangeField
                      label="Marge intérieure"
                      value={settings.page.marginInsideMm}
                      unit="mm"
                      min={10}
                      max={35}
                      step={1}
                      onChange={(v) => setPage({ marginInsideMm: v })}
                    />
                    <RangeField
                      label="Marge extérieure"
                      value={settings.page.marginOutsideMm}
                      unit="mm"
                      min={10}
                      max={30}
                      step={1}
                      onChange={(v) => setPage({ marginOutsideMm: v })}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['Texte justifié', settings.page.justify, (v: boolean) => setPage({ justify: v })],
                        ['Alinéas', settings.page.firstLineIndentMm > 0, (v: boolean) => setPage({ firstLineIndentMm: v ? 5 : 0 })],
                        ['Sommaire', settings.includeToc, (v: boolean) => setSettings((s) => ({ ...s, includeToc: v }))],
                        [
                          'Numéros de chapitre',
                          settings.includeChapterNumbers,
                          (v: boolean) => setSettings((s) => ({ ...s, includeChapterNumbers: v })),
                        ],
                      ] as const
                    ).map(([label, checked, on]) => (
                      <label key={label} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
                        {label}
                        <Switch checked={checked} onCheckedChange={on} />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Aperçu ── */}
            <aside className="space-y-4">
              <div className="mx-auto w-[200px] [perspective:900px]">
                {cover.mode === 'none' ? (
                  <div className="grid aspect-[2/3] place-items-center rounded-lg border border-dashed border-border text-xs text-faint">
                    Sans couverture
                  </div>
                ) : (
                  <div className="[transform:rotateY(-14deg)] transition-transform duration-500 hover:[transform:rotateY(0)]">
                    <BookCover
                      title={meta.title}
                      subtitle={meta.subtitle}
                      author={meta.penName || meta.authorName}
                      background={cover.background?.value}
                      imageUrl={cover.imageUrl}
                      textColor={cover.titleColor}
                      hideText={cover.hideTextOverlay}
                      volume
                    />
                  </div>
                )}
              </div>
              {format === 'pdf' && (
                <div className="rounded-xl border border-border bg-paper p-4 shadow-soft">
                  <p className="text-center text-[10px] tracking-[0.2em] uppercase" style={{ color: theme.colors.accent }}>
                    Chapitre 1
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-center text-[15px]',
                      theme.fonts.heading.startsWith('sans') ? 'font-sans font-semibold' : 'font-serif',
                    )}
                  >
                    {chapters[0]?.title}
                  </p>
                  <p
                    className={cn(
                      'mt-3 line-clamp-6 text-[10.5px] leading-[1.55] text-text/80',
                      settings.page.justify && 'text-justify',
                      theme.fonts.body.startsWith('sans') ? 'font-sans' : 'font-serif',
                    )}
                    style={{ textIndent: settings.page.firstLineIndentMm ? '1.2em' : 0 }}
                  >
                    {chapters[0]
                      ? chapterToMarkdown('', chapters[0].doc, [])
                          .replace(/^#\s*\n+/, '')
                          .replace(/[*_\\#>]/g, '')
                          .slice(0, 520)
                      : ''}
                  </p>
                </div>
              )}
              <Button
                className="w-full"
                size="lg"
                onClick={() => void (format === 'pdf' ? makePdf() : makeEpub())}
                loading={busy === 'pdf' || busy === 'epub'}
                disabled={!loaded || !!busy}
              >
                {busy === 'pdf' || busy === 'epub' ? null : <Download className="size-4" />}
                {format === 'pdf' ? 'Générer le PDF' : 'Générer l’EPUB'}
              </Button>
              {pdfUrl && format === 'pdf' && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener"
                  className="block text-center text-xs text-muted underline underline-offset-4"
                >
                  Ouvrir le dernier PDF
                </a>
              )}
              {!loaded && (
                <p className="flex items-center justify-center gap-2 text-xs text-faint">
                  <Loader2 className="size-3 animate-spin" /> Chargement des réglages…
                </p>
              )}
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Libellé englobant : le champ unique qu'il contient est annoncé avec son nom. */
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function RangeField({
  label,
  value,
  unit = '',
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-[13px]">
        <span className="font-medium text-muted">{label}</span>
        <span className="text-faint tabular-nums">
          {value.toLocaleString('fr-FR')} {unit}
        </span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  );
}
