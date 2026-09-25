import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10.5px] text-muted',
        className,
      )}
      {...props}
    />
  );
}

const badgeTones = {
  neutral: 'bg-surface-2 text-muted',
  ember: 'bg-ember-soft text-ember',
  iris: 'bg-iris-soft text-iris',
  sage: 'bg-sage-soft text-sage',
  amber: 'bg-amber-soft text-amber',
  danger: 'bg-danger-soft text-danger',
} as const;

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] leading-none font-medium [&>svg]:size-3',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Anneau de progression (objectif de mots, etc.). */
export function ProgressRing({
  value,
  size = 36,
  stroke = 3.5,
  className,
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pct >= 1 ? 'var(--c-sage)' : 'var(--c-ember)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.6s var(--ease-out-expo)' }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted [&>svg]:size-5">{icon}</div>}
      <h3 className="font-display text-2xl">{title}</h3>
      {children && <div className="mt-1.5 max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
