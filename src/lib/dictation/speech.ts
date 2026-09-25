'use client';

import { applyVoiceCommands, mergeSegment } from './format';

/* Types minimaux de la Web Speech API (non incluse dans lib.dom). */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function ctor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface RecognizerCallbacks {
  onText: (finalText: string, interim: string) => void;
  onActivity?: (speaking: boolean) => void;
  onError: (message: string, fatal: boolean) => void;
}

/**
 * Reconnaissance vocale du navigateur (texte en direct).
 * Attention RGPD : selon le navigateur, l'audio peut être traité par
 * l'éditeur du navigateur (Google pour Chrome, Apple pour Safari).
 */
export class BrowserRecognizer {
  static isSupported(): boolean {
    return ctor() !== null;
  }

  private rec: SpeechRecognitionLike | null = null;
  private active = false;
  private finalText = '';
  private restarts = 0;

  constructor(private cb: RecognizerCallbacks) {}

  get text() {
    return this.finalText;
  }

  start() {
    const C = ctor();
    if (!C) {
      this.cb.onError('La reconnaissance vocale n’est pas disponible dans ce navigateur.', true);
      return;
    }
    this.active = true;
    this.spawn(C);
  }

  private spawn(C: SpeechRecognitionCtor) {
    const rec = new C();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let sessionFinal = '';
    const base = this.finalText;

    rec.onresult = (e) => {
      let interim = '';
      let finals = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? '';
        if (r.isFinal) finals = mergeSegment(finals, applyVoiceCommands(t, true));
        else interim += t;
      }
      sessionFinal = finals;
      this.finalText = mergeSegment(base, sessionFinal);
      this.restarts = 0;
      this.cb.onText(this.finalText, applyVoiceCommands(interim, false));
    };
    rec.onspeechstart = () => this.cb.onActivity?.(true);
    rec.onspeechend = () => this.cb.onActivity?.(false);
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      const fatal = e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture';
      const messages: Record<string, string> = {
        'not-allowed': 'Accès au micro refusé. Autorisez-le dans les réglages du navigateur.',
        'service-not-allowed': 'La reconnaissance vocale est désactivée sur cet appareil.',
        'audio-capture': 'Aucun micro détecté.',
        network: 'Réseau indisponible pour la reconnaissance vocale.',
      };
      if (fatal) this.active = false;
      this.cb.onError(messages[e.error] ?? 'Reconnaissance vocale interrompue.', fatal);
    };
    rec.onend = () => {
      // Chrome coupe la session après un silence : on relance tant que l'auteur dicte.
      if (this.active && this.restarts < 20) {
        this.restarts++;
        setTimeout(() => this.active && this.spawn(C), 120);
      }
    };
    this.rec = rec;
    try {
      rec.start();
    } catch {
      /* déjà démarré */
    }
  }

  /** Arrête et renvoie le texte final acquis. */
  stop(): string {
    this.active = false;
    try {
      this.rec?.stop();
    } catch {}
    return this.finalText;
  }

  abort() {
    this.active = false;
    try {
      this.rec?.abort();
    } catch {}
  }
}
