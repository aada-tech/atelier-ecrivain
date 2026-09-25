import type { ReactNode } from 'react';
import { BookOpen, Command, Download, Focus, ListTree, Mic, NotebookPen, Sparkles } from 'lucide-react';
import { LogoMark } from '@/components/ui/logo';
import { ProgressRing } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

export const DEMO_CHAPTERS = [
  { title: 'La maison des falaises', words: '2 418' },
  { title: 'Marthe', words: '3 102' },
  { title: 'Le phare', words: '1 204' },
  { title: 'Marée d’équinoxe', words: '0' },
];

/**
 * Réplique fidèle de l'interface de l'atelier (mêmes jetons, mêmes
 * composants), en miniature, pour les démonstrations animées.
 */
export function AppChrome({
  children,
  variant = 'desktop',
  active = 2,
  inspector,
  className,
  theme = 'light',
}: {
  children: ReactNode;
  variant?: 'desktop' | 'phone';
  active?: number;
  inspector?: ReactNode;
  className?: string;
  theme?: 'light' | 'sepia' | 'night';
}) {
  if (variant === 'phone') {
    return (
      <div data-theme={theme} className={cn('relative flex h-full flex-col overflow-hidden bg-bg text-text', className)}>
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-3">
          <LogoMark className="size-6" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12px] font-semibold">Le Phare</p>
            <p className="truncate text-[10px] text-faint">3. {DEMO_CHAPTERS[active].title}</p>
          </div>
          <ProgressRing value={0.64} size={24} stroke={2.5} />
        </div>
        <div className="relative min-h-0 flex-1">{children}</div>
      </div>
    );
  }

  return (
    <div data-theme={theme} className={cn('@container relative flex h-full flex-col overflow-hidden bg-bg text-text', className)}>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/70 bg-bg/80 px-3">
        <LogoMark className="size-6" />
        <p className="text-[12.5px] font-semibold">Le Phare</p>
        <span className="ml-2 flex items-center gap-1.5 text-[11px] text-muted">
          <span className="size-1.5 rounded-full bg-sage" /> Enregistré
        </span>
        <div className="ml-auto flex items-center gap-1 text-muted [&_svg]:size-3.5 [&>span]:grid [&>span]:size-7 [&>span]:place-items-center [&>span]:rounded-md">
          <ProgressRing value={0.64} size={22} stroke={2.5} className="mr-1" />
          <span>
            <Command />
          </span>
          <span>
            <Focus />
          </span>
          <span>
            <BookOpen />
          </span>
          <span className="!flex !w-auto items-center gap-1 border border-border px-2 text-[11px] text-text">
            <Download /> Exporter
          </span>
          <span className="ml-1 !size-6 rounded-full bg-ember text-[10px] font-semibold text-white">C</span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[184px] shrink-0 flex-col border-r border-border/70 bg-surface-2/40 p-2 @4xl:flex">
          <p className="px-2 pt-1 pb-2 text-[9.5px] font-semibold tracking-wider text-faint uppercase">Chapitres</p>
          {DEMO_CHAPTERS.map((c, i) => (
            <div
              key={c.title}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1.5',
                i === active ? 'bg-surface shadow-soft ring-1 ring-border' : 'text-muted',
              )}
            >
              <span className="w-3 text-right font-mono text-[9px] text-faint">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-medium">{c.title}</span>
                <span className="block text-[9px] text-faint">{c.words} mots</span>
              </span>
            </div>
          ))}
          <div className="mt-auto flex items-center gap-2 border-t border-border px-2 pt-2 text-[10px]">
            <ProgressRing value={0.34} size={20} stroke={2.5} />
            <span>
              <span className="block font-medium">6 724 mots</span>
              <span className="text-faint">objectif 20 000</span>
            </span>
          </div>
        </aside>
        <div className="relative min-w-0 flex-1">{children}</div>
        {inspector && <aside className="hidden w-[250px] shrink-0 border-l border-border/70 bg-surface/60 @xl:block">{inspector}</aside>}
      </div>
    </div>
  );
}

export function InspectorTabs({ active = 0 }: { active?: number }) {
  const tabs = [
    { icon: <Sparkles />, label: 'Ratures' },
    { icon: <NotebookPen />, label: 'Notes' },
    { icon: <ListTree />, label: 'Versions' },
  ];
  return (
    <div className="flex gap-1 p-2">
      {tabs.map((t, i) => (
        <span
          key={t.label}
          className={cn(
            'flex h-7 flex-1 items-center justify-center gap-1 rounded-md text-[10.5px] font-medium text-muted [&>svg]:size-3',
            i === active && 'bg-surface-2 text-text',
          )}
        >
          {t.icon}
          {t.label}
        </span>
      ))}
    </div>
  );
}

export function MicBadge() {
  return (
    <span className="grid size-10 place-items-center rounded-full bg-ember text-white shadow-lg">
      <Mic className="size-5" />
    </span>
  );
}
