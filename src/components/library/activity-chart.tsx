'use client';

import { useState } from 'react';
import type { DayStat } from '@/lib/data/stats';
import { dayKey, formatNumber } from '@/lib/utils';

/**
 * Mots écrits par jour (30 jours). Série unique : barres dans la teinte
 * d'atténuation, aujourd'hui en accent. Infobulle au survol + table accessible.
 */
export function ActivityChart({ stats, days = 30 }: { stats: DayStat[]; days?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const byDay = new Map(stats.map((s) => [s.day, s.words]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = dayKey(d);
    return { key, date: d, words: byDay.get(key) ?? 0 };
  });
  const max = Math.max(100, ...series.map((s) => s.words));
  const niceMax = Math.ceil(max / 100) * 100;
  const H = 88;
  const total = series.reduce((s, d) => s + d.words, 0);

  return (
    <figure className="relative">
      <figcaption className="sr-only">
        Mots écrits par jour sur les {days} derniers jours ({formatNumber(total)} au total)
      </figcaption>
      <div
        className="flex items-end gap-[2px]"
        style={{ height: H }}
        role="img"
        aria-label={`Activité : ${formatNumber(total)} mots en ${days} jours`}
        onMouseLeave={() => setHover(null)}
      >
        {series.map((s, i) => {
          const h = s.words ? Math.max(3, (s.words / niceMax) * H) : 2;
          const today = i === series.length - 1;
          return (
            <div key={s.key} className="flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)}>
              <div
                className="w-full max-w-[24px] rounded-t-[4px] transition-[opacity,background] duration-150"
                style={{
                  height: h,
                  background: today ? 'var(--c-ember)' : s.words ? 'var(--c-border-strong)' : 'var(--c-surface-3)',
                  opacity: hover === null || hover === i ? 1 : 0.55,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 h-px bg-border" />
      <div className="mt-1 flex justify-between text-[10.5px] text-faint">
        <span>il y a {days} j</span>
        <span>aujourd’hui</span>
      </div>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface px-2.5 py-1.5 whitespace-nowrap shadow-lift"
          style={{ left: `${((hover + 0.5) / days) * 100}%` }}
        >
          <p className="text-sm font-semibold text-text">{formatNumber(series[hover].words)} mots</p>
          <p className="text-[11px] text-muted">
            {series[hover].date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      )}
      <table className="sr-only">
        <thead>
          <tr>
            <th>Jour</th>
            <th>Mots</th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.key}>
              <td>{s.date.toLocaleDateString('fr-FR')}</td>
              <td>{s.words}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
