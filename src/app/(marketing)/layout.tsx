import { TooltipProvider } from '@/components/ui/tooltip';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="night" data-marketing className="min-h-dvh bg-bg text-text">
      {/* Masque les éléments animés jusqu'à l'hydratation (uniquement si JS actif). */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Aller au contenu
      </a>
      <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
    </div>
  );
}
