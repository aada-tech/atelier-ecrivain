'use client';

import { Dialog as D } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

interface ContentProps {
  children: ReactNode;
  title: string;
  description?: ReactNode;
  className?: string;
  /** « center » : modale centrée ; « right » / « bottom » : panneau coulissant. */
  side?: 'center' | 'right' | 'left' | 'bottom';
  hideTitle?: boolean;
  onOpenAutoFocus?: (e: Event) => void;
}

export function DialogContent({ children, title, description, className, side = 'center', hideTitle, onOpenAutoFocus }: ContentProps) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-[fade-up_0.2s_ease-out]" />
      <D.Content
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(
          'fixed z-50 flex flex-col bg-surface text-text shadow-pop outline-none',
          side === 'center' &&
            'top-1/2 left-1/2 max-h-[min(88dvh,820px)] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border data-[state=open]:animate-[fade-up_0.25s_var(--ease-out-expo)]',
          side === 'right' &&
            'inset-y-0 right-0 w-[min(100vw,440px)] border-l border-border data-[state=open]:animate-[slide-in-right_0.3s_var(--ease-out-expo)]',
          side === 'left' &&
            'inset-y-0 left-0 w-[min(88vw,340px)] border-r border-border data-[state=open]:animate-[slide-in-left_0.3s_var(--ease-out-expo)]',
          side === 'bottom' &&
            'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-[slide-in-bottom_0.3s_var(--ease-out-expo)]',
          className,
        )}
      >
        <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', hideTitle && 'sr-only')}>
          <div className="min-w-0">
            <D.Title className="font-display text-2xl leading-tight">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close
            className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto px-5 pt-4 pb-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
