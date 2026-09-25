'use client';

import { Tooltip as T } from 'radix-ui';
import type { ReactNode } from 'react';

export const TooltipProvider = T.Provider;

export function Tooltip({
  content,
  children,
  side = 'bottom',
  shortcut,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  shortcut?: string;
}) {
  return (
    <T.Root delayDuration={350}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={8}
          collisionPadding={10}
          className="z-[60] flex items-center gap-2 rounded-lg bg-text px-2.5 py-1.5 text-xs font-medium text-bg shadow-lift data-[state=delayed-open]:animate-[fade-up_0.15s_ease-out]"
        >
          {content}
          {shortcut && <kbd className="rounded bg-bg/15 px-1 font-mono text-[10px] opacity-80">{shortcut}</kbd>}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
