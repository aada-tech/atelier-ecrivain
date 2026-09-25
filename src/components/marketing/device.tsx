import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Fenêtre de navigateur minimaliste (bureau). */
export function BrowserFrame({
  children,
  className,
  url = 'atelier-ecrivain.app/atelier',
}: {
  children: ReactNode;
  className?: string;
  url?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a22] shadow-[0_40px_120px_-30px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_255_255/0.04)_inset]',
        className,
      )}
    >
      <div className="flex h-9 items-center gap-2 px-3.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto flex h-6 w-[min(60%,320px)] items-center justify-center rounded-md bg-white/[0.06] font-mono text-[10.5px] text-white/45">
          {url}
        </span>
        <span className="w-10" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

/** Téléphone (format 9:19,5). */
export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative aspect-[9/19.5] rounded-[2.6rem] bg-[#16161d] p-[7px] shadow-[0_40px_90px_-24px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_255_255/0.08)_inset]',
        className,
      )}
    >
      <div className="relative h-full overflow-hidden rounded-[2.15rem] bg-black">
        <div className="absolute top-2 left-1/2 z-50 h-[22px] w-[31%] -translate-x-1/2 rounded-full bg-black" />
        <div className="h-full pt-8">{children}</div>
      </div>
    </div>
  );
}
