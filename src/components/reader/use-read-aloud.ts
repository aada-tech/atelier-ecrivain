'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lecture à voix haute par la synthèse vocale du navigateur (locale, gratuite,
 * sans envoi de texte à un service tiers sur la plupart des systèmes).
 */
export function useReadAloud() {
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [supported, setSupported] = useState(false);
  const queue = useRef<string[]>([]);
  const cancelled = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- détection de fonctionnalité côté client
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const play = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      cancelled.current = false;
      // Les moteurs coupent les longues phrases : on découpe par phrases (~220 caractères).
      const sentences = text.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…»]*\s*/g) ?? [text];
      const chunks: string[] = [];
      let cur = '';
      for (const s of sentences) {
        if ((cur + s).length > 220 && cur) {
          chunks.push(cur);
          cur = s;
        } else cur += s;
      }
      if (cur.trim()) chunks.push(cur);
      queue.current = chunks;
      setState('playing');
      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      const voice =
        voices.find((v) => v.lang.startsWith('fr') && /premium|enhanced|natural|google/i.test(v.name)) ??
        voices.find((v) => v.lang.startsWith('fr'));
      const speakNext = () => {
        const next = queue.current.shift();
        if (!next || cancelled.current) {
          setState('idle');
          return;
        }
        const u = new SpeechSynthesisUtterance(next);
        u.lang = 'fr-FR';
        if (voice) u.voice = voice;
        u.onend = speakNext;
        u.onerror = () => setState('idle');
        synth.speak(u);
      };
      speakNext();
    },
    [supported],
  );

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setState('paused');
  }, []);
  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setState('playing');
  }, []);
  const stop = useCallback(() => {
    cancelled.current = true;
    queue.current = [];
    window.speechSynthesis.cancel();
    setState('idle');
  }, []);

  return { state, supported, play, pause, resume, stop };
}
