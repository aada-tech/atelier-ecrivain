'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRecognizer } from '@/lib/dictation/speech';
import { Recorder, isMobileDevice } from '@/lib/dictation/recorder';
import { ai, AiRequestError } from '@/lib/ai/client';
import type { TranscribeResponse } from '@/lib/ai/contracts';
import type { DictationEngine } from '@/lib/data/profile';

export type DictationPhase = 'idle' | 'listening' | 'paused' | 'processing';
export type ResolvedEngine = 'browser' | 'cloud' | 'hybrid';

export interface DictationState {
  phase: DictationPhase;
  engine: ResolvedEngine | null;
  /** Texte acquis + provisoire, affiché en direct dans l'éditeur. */
  live: string;
  level: number;
  speaking: boolean;
  elapsed: number;
  error: string | null;
}

export interface DictationResult {
  text: string;
  revisions: TranscribeResponse['revisions'];
  engine: ResolvedEngine;
}

const MAX_SECONDS = 6 * 60;

const INITIAL: DictationState = {
  phase: 'idle',
  engine: null,
  live: '',
  level: 0,
  speaking: false,
  elapsed: 0,
  error: null,
};

export function resolveEngine(pref: DictationEngine, aiAllowed: boolean): ResolvedEngine | null {
  const browserOk = BrowserRecognizer.isSupported();
  const cloudOk = Recorder.isSupported() && aiAllowed;
  if (pref === 'browser') return browserOk ? 'browser' : cloudOk ? 'cloud' : null;
  if (pref === 'cloud') return cloudOk ? 'cloud' : browserOk ? 'browser' : null;
  // Auto : sur ordinateur, texte en direct + affinage IA ; sur mobile, un seul
  // accès micro à la fois (contrainte iOS/Android).
  if (browserOk) return cloudOk && !isMobileDevice() ? 'hybrid' : 'browser';
  return cloudOk ? 'cloud' : null;
}

interface Options {
  engine: DictationEngine;
  aiAllowed: boolean;
  /** Texte qui précède le curseur (cohérence de la transcription IA). */
  getContext: () => string;
  onLive: (text: string) => void;
  onResult: (result: DictationResult) => void;
  onError?: (message: string) => void;
}

export function useDictation(opts: Options) {
  const [state, setState] = useState<DictationState>(INITIAL);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });
  const recognizer = useRef<BrowserRecognizer | null>(null);
  const recorder = useRef<Recorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const engineRef = useRef<ResolvedEngine | null>(null);
  const elapsedRef = useRef(0);
  const pausedText = useRef('');

  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const fail = useCallback((message: string) => {
    clearTimer();
    recognizer.current?.abort();
    recorder.current?.cancel();
    recognizer.current = null;
    recorder.current = null;
    setState({ ...INITIAL, error: message });
    optsRef.current.onLive('');
    optsRef.current.onError?.(message);
  }, []);

  const stopRef = useRef<() => void>(() => {});

  const startTimer = useCallback(() => {
    clearTimer();
    timer.current = setInterval(() => {
      elapsedRef.current += 1;
      setState((s) => ({ ...s, elapsed: elapsedRef.current }));
      if (elapsedRef.current >= MAX_SECONDS) stopRef.current();
    }, 1000);
  }, []);

  const start = useCallback(async () => {
    if (state.phase !== 'idle') return;
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      fail('La dictée nécessite une connexion sécurisée (HTTPS).');
      return;
    }
    const engine = resolveEngine(optsRef.current.engine, optsRef.current.aiAllowed);
    if (!engine) {
      fail(
        optsRef.current.aiAllowed
          ? 'Ce navigateur ne permet pas la dictée.'
          : 'La dictée n’est pas disponible dans ce navigateur sans la transcription IA. Activez l’IA dans Compte › IA.',
      );
      return;
    }
    engineRef.current = engine;
    elapsedRef.current = 0;
    pausedText.current = '';
    setState({ ...INITIAL, phase: 'listening', engine });

    if (engine === 'browser' || engine === 'hybrid') {
      const rec = new BrowserRecognizer({
        onText: (finalText, interim) => {
          const live = [finalText, interim].filter(Boolean).join(' ');
          setState((s) => ({ ...s, live }));
          optsRef.current.onLive(live);
        },
        onActivity: (speaking) => setState((s) => ({ ...s, speaking, level: speaking ? 0.7 : 0.15 })),
        onError: (message, fatal) => {
          if (fatal) fail(message);
        },
      });
      recognizer.current = rec;
      rec.start();
    }
    if (engine === 'cloud' || engine === 'hybrid') {
      const r = new Recorder((level) => setState((s) => (Math.abs(s.level - level) > 0.04 ? { ...s, level } : s)));
      recorder.current = r;
      try {
        await r.start();
      } catch (err) {
        if (engine === 'hybrid') {
          // Le texte en direct continue sans affinage IA.
          recorder.current = null;
          engineRef.current = 'browser';
          setState((s) => ({ ...s, engine: 'browser' }));
        } else {
          fail(err instanceof Error ? err.message : 'Micro indisponible.');
          return;
        }
      }
    }
    startTimer();
  }, [state.phase, fail, startTimer]);

  const stop = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    clearTimer();
    const browserText = recognizer.current?.stop() ?? pausedText.current;
    pausedText.current = '';
    recognizer.current = null;
    const rec = recorder.current;
    recorder.current = null;

    if (!rec) {
      setState(INITIAL);
      optsRef.current.onLive('');
      if (browserText.trim()) optsRef.current.onResult({ text: browserText, revisions: [], engine });
      return;
    }

    setState((s) => ({ ...s, phase: 'processing', live: browserText || s.live, level: 0 }));
    const blob = await rec.stop();
    if (blob.size < 2_000 && !browserText.trim()) {
      setState(INITIAL);
      optsRef.current.onLive('');
      optsRef.current.onError?.('Rien n’a été entendu. Rapprochez-vous du micro.');
      return;
    }
    abort.current = new AbortController();
    const timeout = setTimeout(() => abort.current?.abort(), 45_000);
    try {
      const res = await ai.transcribe(blob, { context: optsRef.current.getContext() }, abort.current.signal);
      const text = res.text.trim() || browserText;
      setState(INITIAL);
      optsRef.current.onLive('');
      if (text.trim()) optsRef.current.onResult({ text, revisions: res.revisions, engine });
      else optsRef.current.onError?.('Rien n’a été entendu. Rapprochez-vous du micro.');
    } catch (err) {
      setState(INITIAL);
      optsRef.current.onLive('');
      if (browserText.trim()) {
        // Jamais de perte : on garde la transcription du navigateur.
        optsRef.current.onResult({ text: browserText, revisions: [], engine: 'browser' });
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          optsRef.current.onError?.('Affinage IA indisponible : texte du navigateur conservé.');
        }
      } else {
        optsRef.current.onError?.(err instanceof AiRequestError ? err.message : 'Transcription impossible. Réessayez.');
      }
    } finally {
      clearTimeout(timeout);
      abort.current = null;
    }
  }, []);

  useEffect(() => {
    stopRef.current = () => void stop();
  }, [stop]);

  const pause = useCallback(() => {
    if (state.phase !== 'listening') return;
    clearTimer();
    recorder.current?.pause();
    if (recognizer.current) {
      // La Web Speech API ne sait pas « pauser » : on fige le texte acquis.
      const text = recognizer.current.stop();
      recognizer.current = null;
      pausedText.current = text;
    }
    setState((s) => ({ ...s, phase: 'paused', speaking: false, level: 0 }));
  }, [state.phase]);

  const resume = useCallback(() => {
    if (state.phase !== 'paused') return;
    recorder.current?.resume();
    const engine = engineRef.current;
    if (engine === 'browser' || engine === 'hybrid') {
      const prefix = pausedText.current;
      const rec = new BrowserRecognizer({
        onText: (finalText, interim) => {
          const live = [prefix, finalText, interim].filter(Boolean).join(' ');
          setState((s) => ({ ...s, live }));
          optsRef.current.onLive(live);
        },
        onActivity: (speaking) => setState((s) => ({ ...s, speaking, level: speaking ? 0.7 : 0.15 })),
        onError: (message, fatal) => fatal && fail(message),
      });
      const originalStop = rec.stop.bind(rec);
      rec.stop = () => [prefix, originalStop()].filter(Boolean).join(' ');
      recognizer.current = rec;
      rec.start();
    }
    setState((s) => ({ ...s, phase: 'listening' }));
    startTimer();
  }, [state.phase, fail, startTimer]);

  const cancel = useCallback(() => {
    clearTimer();
    abort.current?.abort();
    recognizer.current?.abort();
    recorder.current?.cancel();
    recognizer.current = null;
    recorder.current = null;
    engineRef.current = null;
    setState(INITIAL);
    optsRef.current.onLive('');
  }, []);

  useEffect(
    () => () => {
      clearTimer();
      recognizer.current?.abort();
      recorder.current?.cancel();
      abort.current?.abort();
    },
    [],
  );

  const toggle = useCallback(() => {
    if (state.phase === 'idle') void start();
    else if (state.phase === 'listening' || state.phase === 'paused') void stop();
  }, [state.phase, start, stop]);

  return { state, start, stop, pause, resume, cancel, toggle, maxSeconds: MAX_SECONDS };
}
