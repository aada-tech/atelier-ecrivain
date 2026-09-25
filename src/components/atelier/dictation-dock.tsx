'use client';

import { Check, Mic, Pause, Play, X, Loader2 } from 'lucide-react';
import { Waveform } from '@/components/ui/waveform';
import { Tooltip } from '@/components/ui/tooltip';
import { cn, formatDuration } from '@/lib/utils';
import type { DictationState } from './use-dictation';

interface Props {
  state: DictationState;
  maxSeconds: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  className?: string;
}

const ENGINE_LABEL = { browser: 'Direct', cloud: 'IA', hybrid: 'Direct + IA' } as const;

export function DictationDock({ state, maxSeconds, onStart, onStop, onPause, onResume, onCancel, className }: Props) {
  const { phase } = state;
  const remaining = maxSeconds - state.elapsed;

  if (phase === 'idle') {
    return (
      <div className={cn('pointer-events-auto', className)}>
        <Tooltip content="Dicter" shortcut="⌥D" side="top">
          <button
            type="button"
            onClick={onStart}
            aria-label="Commencer la dictée"
            className="group relative grid size-14 place-items-center rounded-full bg-ember text-white shadow-[0_12px_32px_-8px_color-mix(in_oklab,var(--c-ember)_80%,transparent)] transition hover:scale-105 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-ember opacity-0 group-hover:animate-pulse-ring group-hover:opacity-100" />
            <Mic className="relative size-6" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Dictée en cours"
      className={cn(
        'pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface/95 p-1.5 pl-4 shadow-pop backdrop-blur-md',
        className,
      )}
    >
      {phase === 'processing' ? (
        <div className="flex items-center gap-2.5 pr-3 text-sm font-medium text-iris">
          <Loader2 className="size-4 animate-spin" /> Affinage de la dictée…
        </div>
      ) : (
        <>
          <span className="relative flex size-2.5">
            {phase === 'listening' && <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember opacity-60" />}
            <span className={cn('relative inline-flex size-2.5 rounded-full', phase === 'listening' ? 'bg-ember' : 'bg-faint')} />
          </span>
          <span className={cn('w-12 font-mono text-sm tabular-nums', remaining < 30 && 'text-danger')} aria-live="off">
            {formatDuration(state.elapsed)}
          </span>
          <Waveform level={state.level} active={phase === 'listening'} bars={18} className="hidden text-ember sm:flex" />
          {state.engine && (
            <span className="hidden rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-muted md:inline">
              {ENGINE_LABEL[state.engine]}
            </span>
          )}
          <Tooltip content={phase === 'paused' ? 'Reprendre' : 'Pause'} side="top">
            <button
              type="button"
              onClick={phase === 'paused' ? onResume : onPause}
              className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text"
              aria-label={phase === 'paused' ? 'Reprendre la dictée' : 'Mettre en pause'}
            >
              {phase === 'paused' ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
          </Tooltip>
          <Tooltip content="Annuler" side="top">
            <button
              type="button"
              onClick={onCancel}
              className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-danger-soft hover:text-danger"
              aria-label="Annuler la dictée"
            >
              <X className="size-4" />
            </button>
          </Tooltip>
          <button
            type="button"
            onClick={onStop}
            className="flex h-11 items-center gap-2 rounded-full bg-ember px-4 text-sm font-semibold text-white transition hover:bg-ember-strong"
          >
            <Check className="size-4" /> Insérer
          </button>
        </>
      )}
    </div>
  );
}
