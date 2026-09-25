'use client';

import { cn } from '@/lib/utils';

const PATTERN = [0.35, 0.6, 0.9, 0.55, 1, 0.7, 0.45, 0.85, 0.5, 0.95, 0.6, 0.4, 0.75, 1, 0.55, 0.8, 0.45, 0.65, 0.9, 0.5];

/** Onde audio stylisée : amplitude pilotée par le niveau du micro (0–1). */
export function Waveform({
  level,
  active,
  bars = 20,
  className,
  barClassName,
}: {
  level: number;
  active: boolean;
  bars?: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn('flex h-7 items-center gap-[3px]', className)} aria-hidden>
      {Array.from({ length: bars }, (_, i) => {
        const p = PATTERN[i % PATTERN.length];
        const scale = active ? Math.max(0.12, Math.min(1, 0.18 + level * p * 1.1)) : 0.12;
        return (
          <span
            key={i}
            className={cn('w-[3px] rounded-full bg-current transition-transform duration-100 ease-out', active && 'animate-[wave_0.9s_ease-in-out_infinite]', barClassName)}
            style={{
              height: '100%',
              transform: `scaleY(${scale})`,
              animationDelay: `${(i % 7) * -0.13}s`,
            }}
          />
        );
      })}
    </div>
  );
}
