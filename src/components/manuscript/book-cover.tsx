import { cn } from '@/lib/utils';

export interface BookCoverProps {
  title: string;
  subtitle?: string;
  author?: string;
  background?: string;
  imageUrl?: string;
  textColor?: string;
  hideText?: boolean;
  className?: string;
  /** Affiche la tranche et l'ombre d'un livre posé. */
  volume?: boolean;
}

/**
 * Couverture rendue en HTML/CSS, fidèle à la page de couverture du PDF.
 * Utilisée dans la bibliothèque, l'export et les démonstrations.
 */
export function BookCover({
  title,
  subtitle,
  author,
  background,
  imageUrl,
  textColor = '#fff',
  hideText,
  className,
  volume,
}: BookCoverProps) {
  return (
    <div
      className={cn(
        '[container-type:inline-size] relative aspect-[2/3] overflow-hidden rounded-[3px_8px_8px_3px]',
        volume && 'shadow-[inset_4px_0_6px_-3px_rgb(0_0_0/0.35),0_18px_40px_-14px_rgb(0_0_0/0.5),0_2px_4px_rgb(0_0_0/0.18)]',
        className,
      )}
      style={{ background: background ?? 'linear-gradient(160deg,#1d1b2b,#3b2a4a 55%,#f2542d 140%)', color: textColor }}
    >
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      {imageUrl && !hideText && <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />}
      {volume && <div className="absolute inset-y-0 left-[3.5%] w-px bg-white/25 mix-blend-overlay" />}
      {!hideText && (
        <div className="relative flex h-full flex-col items-center justify-between px-[9%] pt-[18%] pb-[10%] text-center">
          <div>
            <p className="font-display text-[clamp(10px,12.5cqi,64px)] leading-[1.05] [text-wrap:balance]">{title || 'Sans titre'}</p>
            {subtitle && <p className="mt-[6cqi] font-serif text-[clamp(7px,4.6cqi,20px)] italic opacity-85">{subtitle}</p>}
          </div>
          {author && <p className="font-sans text-[clamp(6px,4.2cqi,16px)] font-medium tracking-[0.18em] uppercase opacity-90">{author}</p>}
        </div>
      )}
    </div>
  );
}
