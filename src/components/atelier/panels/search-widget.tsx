'use client';

import { useTheme } from '@/components/providers/theme-provider';

/**
 * Suggestions de recherche Google exigées par les conditions du « grounding ».
 * Le HTML fourni par Google est isolé dans une iframe sandbox sans scripts :
 * il ne peut ni accéder à la page ni exécuter de code.
 */
export function SearchWidget({ html }: { html: string }) {
  const { resolved } = useTheme();
  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{margin:0;background:transparent;color-scheme:${resolved === 'night' ? 'dark' : 'light'}}</style></head><body>${html}</body></html>`;
  return (
    <iframe
      title="Suggestions de recherche Google"
      srcDoc={doc}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className="h-[72px] w-full rounded-lg border-0"
      loading="lazy"
    />
  );
}
