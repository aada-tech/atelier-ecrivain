import 'server-only';

/**
 * Détection du type audio par signature binaire : Safari iOS annonce souvent
 * un type vide ou « video/mp4 » pour de l'audio pur.
 */
export function detectAudioMime(bytes: Uint8Array, declared = ''): string {
  if (bytes.length >= 4) {
    if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'audio/webm';
    if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return 'audio/ogg';
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x41 &&
      bytes[10] === 0x56 &&
      bytes[11] === 0x45
    )
      return 'audio/wav';
    if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'audio/mp4';
    if ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
      return 'audio/mpeg';
    }
  }
  const base = declared.split(';')[0].trim().toLowerCase();
  if (base.includes('webm')) return 'audio/webm';
  if (base.includes('ogg')) return 'audio/ogg';
  if (base.includes('mp4') || base.includes('m4a')) return 'audio/mp4';
  if (base.includes('wav')) return 'audio/wav';
  if (base.includes('mpeg') || base.includes('mp3')) return 'audio/mpeg';
  if (base.includes('aac')) return 'audio/aac';
  return 'application/octet-stream';
}
