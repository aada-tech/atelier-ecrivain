'use client';

import type { BookMetadata, CoverConfig } from '@/features/export/types/bookMeta';

/** Extrait angle et arrêts d'un dégradé CSS simple (celui des palettes de couverture). */
export function parseGradient(value: string): { angle: number; stops: { offset: number; color: string }[] } | null {
  const m = value.trim().match(/^linear-gradient\((.+)\)$/i);
  if (!m) return null;
  const parts = m[1].split(/,(?![^(]*\))/).map((p) => p.trim());
  let angle = 180;
  if (/deg$/.test(parts[0])) angle = parseFloat(parts.shift()!);
  const stops = parts.map((p, i) => {
    const [color, pos] = p.split(/\s+/);
    return { color, offset: pos?.endsWith('%') ? Math.min(1, parseFloat(pos) / 100) : i / Math.max(1, parts.length - 1) };
  });
  return { angle, stops };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Dessine la couverture (fond + titre) en JPEG 1200×1800 pour l'EPUB. */
export async function renderCoverJpeg(cover: CoverConfig, meta: BookMetadata): Promise<string> {
  const W = 1200;
  const H = 1800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const bg = cover.background?.value ?? '#1d1b2b';
  const g = parseGradient(bg);
  if (g) {
    const rad = ((g.angle - 90) * Math.PI) / 180;
    const len = Math.abs(W * Math.cos(rad)) + Math.abs(H * Math.sin(rad));
    const cx = W / 2;
    const cy = H / 2;
    const grad = ctx.createLinearGradient(cx - (Math.cos(rad) * len) / 2, cy - (Math.sin(rad) * len) / 2, cx + (Math.cos(rad) * len) / 2, cy + (Math.sin(rad) * len) / 2);
    for (const s of g.stops) grad.addColorStop(s.offset, s.color);
    ctx.fillStyle = grad;
  } else ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  await document.fonts.ready.catch(() => {});
  const display = getComputedStyle(document.documentElement).getPropertyValue('--font-instrument').trim() || 'Georgia';
  const sans = getComputedStyle(document.documentElement).getPropertyValue('--font-geist').trim() || 'sans-serif';
  ctx.fillStyle = cover.titleColor ?? '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `150px ${display}`;
  const lines = wrap(ctx, meta.title || 'Sans titre', W * 0.8);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 420 + i * 160));
  if (meta.subtitle) {
    ctx.font = `italic 52px ${display}`;
    ctx.globalAlpha = 0.85;
    wrap(ctx, meta.subtitle, W * 0.75).forEach((l, i) => ctx.fillText(l, W / 2, 420 + lines.length * 160 + 40 + i * 64));
    ctx.globalAlpha = 1;
  }
  ctx.font = `500 44px ${sans}`;
  const author = (meta.penName || meta.authorName || '').toUpperCase().split('').join(' ');
  ctx.fillText(author, W / 2, H - 170);
  return canvas.toDataURL('image/jpeg', 0.88);
}
