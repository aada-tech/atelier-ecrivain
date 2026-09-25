'use client';

import { Switch as S } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Switch({ className, ...props }: ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-border-strong bg-surface-3 transition-colors',
        'disabled:opacity-50 data-[state=checked]:border-transparent data-[state=checked]:bg-ember',
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-[18px] translate-x-[2px] rounded-full bg-white shadow-soft transition-transform duration-200 data-[state=checked]:translate-x-[18px]" />
    </S.Root>
  );
}
