'use client';

import { Slider as S } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Slider({ className, 'aria-label': ariaLabel, ...props }: ComponentProps<typeof S.Root>) {
  return (
    <S.Root className={cn('relative flex h-5 w-full touch-none items-center select-none', className)} {...props}>
      <S.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-3">
        <S.Range className="absolute h-full bg-ember" />
      </S.Track>
      <S.Thumb
        aria-label={ariaLabel}
        className="block size-4 rounded-full border-2 border-ember bg-surface shadow-soft transition-transform hover:scale-110"
      />
    </S.Root>
  );
}
