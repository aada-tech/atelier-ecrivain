'use client';

/** Charge une image (fichier ou data URL) dans un élément <img>. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/**
 * Redimensionne et compresse en JPEG jusqu'à passer sous `maxBytes`
 * (stockage Firestore, EPUB). Recadre au ratio demandé si `cover` est vrai.
 */
export async function compressImage(
  src: string,
  opts: { maxWidth: number; maxHeight: number; maxBytes: number; cover?: boolean },
): Promise<string> {
  const img = await loadImage(src);
  let w = opts.maxWidth;
  let h = opts.maxHeight;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (opts.cover) {
    const target = w / h;
    const ratio = sw / sh;
    if (ratio > target) {
      sw = sh * target;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = sw / target;
      sy = (img.naturalHeight - sh) / 2;
    }
    w = Math.min(w, Math.round(sw));
    h = Math.round(w / target);
  } else {
    const scale = Math.min(1, w / sw, h / sh);
    w = Math.round(sw * scale);
    h = Math.round(sh * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  let quality = 0.86;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length > opts.maxBytes && quality > 0.4) {
    quality -= 0.08;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  if (out.length > opts.maxBytes) throw new Error('Image trop lourde, même compressée.');
  return out;
}
