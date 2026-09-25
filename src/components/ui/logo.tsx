import { cn } from '@/lib/utils';

/**
 * Logotype : une plume dont la fente est une onde sonore — la voix devient encre.
 */
export function LogoMark({ className, title = 'Atelier' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} role="img" aria-label={title}>
      <defs>
        <linearGradient id="atelier-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9466" />
          <stop offset="0.55" stopColor="#f2542d" />
          <stop offset="1" stopColor="#e03a5f" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#atelier-logo-g)" />
      <path
        d="M16 5.5c3.6 3.2 6.2 7.4 6.2 11.6 0 2.8-1.5 5-3.4 6.4L16 27.5l-2.8-4c-1.9-1.4-3.4-3.6-3.4-6.4 0-4.2 2.6-8.4 6.2-11.6Z"
        fill="#fff"
        fillOpacity="0.96"
      />
      <g stroke="#f2542d" strokeWidth="1.6" strokeLinecap="round">
        <path d="M16 10.5v10" />
        <path d="M13.2 14v4" />
        <path d="M18.8 13v5.5" />
      </g>
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-7" />
      {!compact && (
        <span className="font-display text-[1.35rem] leading-none tracking-tight">
          Atelier<span className="text-ember">.</span>
        </span>
      )}
    </span>
  );
}
