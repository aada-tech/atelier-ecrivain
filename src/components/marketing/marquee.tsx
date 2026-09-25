const WORDS = [
  'Romans',
  'Essais',
  'Mémoires',
  'Nouvelles',
  'Récits de voyage',
  'Thèses',
  'Biographies',
  'Poésie',
  'Scénarios',
  'Journaux intimes',
  'Contes',
  'Manifestes',
];

export function Marquee() {
  const row = [...WORDS, ...WORDS];
  return (
    <div
      className="relative overflow-hidden border-y border-white/[0.06] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] py-6"
      aria-hidden
    >
      <div className="marquee-track gap-10 motion-reduce:animate-none">
        {row.map((w, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-3xl whitespace-nowrap text-white/40 sm:text-4xl">
            {w}
            <span className="text-ember/70">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
