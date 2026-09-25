'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={88}
      mobileOffset={96}
      toastOptions={{
        classNames: {
          toast:
            '!bg-surface !text-text !border !border-border !shadow-lift !rounded-xl !font-sans !text-[13px] !gap-2.5',
          description: '!text-muted',
          actionButton: '!bg-ember !text-white !rounded-md',
          cancelButton: '!bg-surface-2 !text-muted',
        },
      }}
    />
  );
}
