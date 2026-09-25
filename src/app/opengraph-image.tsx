import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Atelier — Parlez. Votre livre s’écrit.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const [regular, italic] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/pdf/Literata-Regular.woff')),
    readFile(join(process.cwd(), 'public/fonts/pdf/Literata-Italic.woff')),
  ]);
  const bars = [0.3, 0.55, 0.8, 0.5, 1, 0.65, 0.4, 0.9, 0.6, 0.35, 0.7, 1, 0.5, 0.8, 0.45, 0.3];
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 90,
        background:
          'radial-gradient(circle at 10% 0%, rgba(255,106,61,0.45), transparent 50%), radial-gradient(circle at 100% 100%, rgba(141,128,255,0.4), transparent 55%), #0b0b10',
        color: '#eeebf3',
        fontFamily: 'Literata',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, color: '#a39fb0' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#ff9466,#f2542d,#e03a5f)' }} />
        L’Atelier de l’Écrivain
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40, fontSize: 104, lineHeight: 1.02, letterSpacing: -3 }}>
        <span>Parlez.</span>
        <span style={{ display: 'flex' }}>
          Votre livre&nbsp;<span style={{ fontStyle: 'italic', color: '#ff6a3d' }}>s’écrit.</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 44, height: 40 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ width: 6, height: `${h * 100}%`, borderRadius: 3, background: '#ff6a3d' }} />
        ))}
        <span style={{ marginLeft: 24, fontSize: 28, color: '#a39fb0' }}>Dictée · Ratures IA · Faits vérifiés · PDF & EPUB</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Literata', data: regular, style: 'normal', weight: 400 },
        { name: 'Literata', data: italic, style: 'italic', weight: 400 },
      ],
    },
  );
}
