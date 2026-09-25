import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from 'radix-ui';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const variants = {
  primary:
    'bg-ember text-white shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_8px_24px_-8px_color-mix(in_oklab,var(--c-ember)_70%,transparent)] hover:bg-ember-strong',
  ai: 'bg-iris text-white shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_8px_24px_-8px_color-mix(in_oklab,var(--c-iris)_70%,transparent)] hover:bg-iris-strong',
  secondary: 'bg-surface text-text border border-border shadow-soft hover:bg-surface-2 hover:border-border-strong',
  ghost: 'text-muted hover:text-text hover:bg-surface-2',
  outline: 'border border-border-strong text-text hover:bg-surface-2',
  danger: 'bg-danger text-white hover:brightness-110',
  link: 'text-ember underline-offset-4 hover:underline px-0 h-auto',
} as const;

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
  'icon-sm': 'h-8 w-8 rounded-md',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', asChild, loading, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background,color,border,box-shadow,transform] duration-200 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
});
