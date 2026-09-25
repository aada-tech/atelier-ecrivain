'use client';

import { DropdownMenu as M } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;
export const MenuSub = M.Sub;

export function MenuContent({ className, align = 'end', sideOffset = 6, ...props }: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          'z-50 min-w-[210px] overflow-hidden rounded-xl border border-border bg-surface p-1.5 text-sm text-text shadow-lift',
          'data-[state=open]:animate-[fade-up_0.18s_var(--ease-out-expo)]',
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

interface ItemProps extends Omit<ComponentProps<typeof M.Item>, 'asChild'> {
  icon?: ReactNode;
  shortcut?: string;
  tone?: 'default' | 'danger';
  /** Transforme l'entrée en lien de navigation. */
  href?: string;
}

export function MenuItem({ className, icon, shortcut, tone = 'default', href, children, ...props }: ItemProps) {
  const inner = (
    <>
      {icon && <span className="grid size-4 place-items-center text-muted [&>svg]:size-4">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <kbd className="font-mono text-[11px] text-faint">{shortcut}</kbd>}
    </>
  );
  const cls = cn(
    'flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 transition-colors outline-none select-none',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-surface-2',
    tone === 'danger' && 'text-danger data-[highlighted]:bg-danger-soft',
    className,
  );
  if (href) {
    return (
      <M.Item asChild className={cls} {...props}>
        <Link href={href}>{inner}</Link>
      </M.Item>
    );
  }
  return (
    <M.Item className={cls} {...props}>
      {inner}
    </M.Item>
  );
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof M.Label>) {
  return <M.Label className={cn('px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wider text-faint uppercase', className)} {...props} />;
}

export function MenuSeparator({ className, ...props }: ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cn('my-1 h-px bg-border', className)} {...props} />;
}
