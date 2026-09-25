import 'server-only';

/**
 * Client REST minimal pour l'API Gemini (generateContent), avec chaîne de
 * repli entre modèles. Aucune dépendance SDK : contrôle total des en-têtes,
 * des délais et de ce qui est journalisé (jamais le contenu).
 */

export type ModelFamily = 'text' | 'fast' | 'audio' | 'grounded' | 'image';

const DEFAULT_CHAINS: Record<ModelFamily, string[]> = {
  text: ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'],
  fast: ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'],
  audio: ['gemini-3.8-flash', 'gemini-3.5-flash'],
  grounded: ['gemini-3.8-flash', 'gemini-3.7-flash'],
  image: ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'],
};

const ENV_KEYS: Record<ModelFamily, string> = {
  text: 'AI_MODELS_TEXT',
  fast: 'AI_MODELS_FAST',
  audio: 'AI_MODELS_AUDIO',
  grounded: 'AI_MODELS_GROUNDED',
  image: 'AI_MODELS_IMAGE',
};

export function modelChain(family: ModelFamily): string[] {
  const raw = process.env[ENV_KEYS[family]];
  const fromEnv = raw
    ?.split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9.\-]+$/i.test(s));
  return fromEnv?.length ? fromEnv : DEFAULT_CHAINS[family];
}

export interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  thought?: boolean;
}

export interface GenerateOptions {
  family: ModelFamily;
  apiKey: string;
  parts: Part[];
  systemInstruction?: string;
  json?: boolean;
  responseSchema?: Record<string, unknown>;
  googleSearch?: boolean;
  imageOutput?: boolean;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GenerateResult {
  model: string;
  text: string;
  images: { mimeType: string; data: string }[];
  sources: GroundingSource[];
  searchWidgetHtml?: string;
  finishReason?: string;
}

export class UpstreamError extends Error {
  constructor(
    public kind: 'quota' | 'blocked' | 'unavailable' | 'bad_request' | 'auth',
    message: string,
  ) {
    super(message);
  }
}

interface ApiCandidate {
  content?: { parts?: Array<Part & { audioTranscription?: { text?: string } }> };
  finishReason?: string;
  groundingMetadata?: {
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    searchEntryPoint?: { renderedContent?: string };
  };
}

function buildBody(opts: GenerateOptions, withThinking: boolean) {
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: opts.maxOutputTokens ?? 4096,
    temperature: opts.temperature ?? 0.4,
  };
  if (opts.json && !opts.googleSearch) {
    generationConfig.responseMimeType = 'application/json';
    if (opts.responseSchema) generationConfig.responseSchema = opts.responseSchema;
  }
  if (opts.imageOutput) generationConfig.responseModalities = ['TEXT', 'IMAGE'];
  // Réflexion minimale : latence réduite pour des tâches d'édition ciblées.
  if (withThinking && !opts.imageOutput) generationConfig.thinkingConfig = { thinkingLevel: 'low' };

  return {
    contents: [{ role: 'user', parts: opts.parts }],
    ...(opts.systemInstruction ? { systemInstruction: { parts: [{ text: opts.systemInstruction }] } } : {}),
    ...(opts.googleSearch ? { tools: [{ googleSearch: {} }] } : {}),
    generationConfig,
    safetySettings: [
      // Un roman peut légitimement traiter de violence ou de sujets sensibles.
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };
}

async function callModel(model: string, opts: GenerateOptions, withThinking: boolean): Promise<GenerateResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': opts.apiKey },
    body: JSON.stringify(buildBody(opts, withThinking)),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 429) throw new UpstreamError('quota', 'Quota du modèle atteint');
    if (res.status === 401 || res.status === 403) throw new UpstreamError('auth', 'Clé API refusée');
    if (res.status === 404) throw new UpstreamError('unavailable', `Modèle ${model} indisponible`);
    if (res.status === 400) {
      if (/thinking/i.test(detail)) throw new UpstreamError('bad_request', 'thinking');
      if (/not found|not supported|unsupported/i.test(detail)) throw new UpstreamError('unavailable', `Modèle ${model} non supporté`);
      throw new UpstreamError('bad_request', 'Requête refusée par le modèle');
    }
    throw new UpstreamError('unavailable', `Erreur ${res.status}`);
  }

  const json = (await res.json()) as { candidates?: ApiCandidate[]; promptFeedback?: { blockReason?: string } };
  if (json.promptFeedback?.blockReason) throw new UpstreamError('blocked', 'Contenu bloqué par les filtres du fournisseur');
  const cand = json.candidates?.[0];
  if (!cand) throw new UpstreamError('unavailable', 'Réponse vide');
  if (cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') {
    throw new UpstreamError('blocked', 'Contenu bloqué par les filtres du fournisseur');
  }

  let text = '';
  const images: GenerateResult['images'] = [];
  for (const part of cand.content?.parts ?? []) {
    if (part.thought) continue;
    if (part.audioTranscription?.text) text += part.audioTranscription.text;
    if (typeof part.text === 'string') text += part.text;
    if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('image/')) images.push(part.inlineData);
  }

  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of cand.groundingMetadata?.groundingChunks ?? []) {
    const uri = chunk.web?.uri;
    if (!uri || !/^https:\/\//.test(uri) || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({ uri, title: (chunk.web?.title || new URL(uri).hostname).slice(0, 200) });
  }

  return {
    model,
    text: text.trim(),
    images,
    sources: sources.slice(0, 12),
    searchWidgetHtml: cand.groundingMetadata?.searchEntryPoint?.renderedContent,
    finishReason: cand.finishReason,
  };
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  let lastError: unknown;
  for (const model of modelChain(opts.family)) {
    try {
      try {
        return await callModel(model, opts, true);
      } catch (err) {
        // Certains modèles refusent thinkingConfig : on réessaie sans.
        if (err instanceof UpstreamError && err.kind === 'bad_request' && err.message === 'thinking') {
          return await callModel(model, opts, false);
        }
        throw err;
      }
    } catch (err) {
      lastError = err;
      if (err instanceof UpstreamError && (err.kind === 'blocked' || err.kind === 'auth')) throw err;
      console.warn(`[ai] ${model} indisponible (${err instanceof Error ? err.message : 'erreur'}), repli`);
    }
  }
  if (lastError instanceof UpstreamError) throw lastError;
  throw new UpstreamError('unavailable', 'Aucun modèle disponible');
}

/** Extrait le premier objet/tableau JSON d'une réponse texte (modèles avec outils). */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    if (start === -1) throw new Error('JSON introuvable');
    const opener = cleaned[start];
    const closer = opener === '{' ? '}' : ']';
    const end = cleaned.lastIndexOf(closer);
    if (end <= start) throw new Error('JSON incomplet');
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

/** Récupère le champ "text" d'un JSON tronqué, ou le texte brut s'il n'est pas du JSON. */
export function salvageText(output: string): string {
  const match = output.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (match) {
    try {
      return JSON.parse(`"${match[1].replace(/\\$/, '')}"`) as string;
    } catch {
      return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
  }
  return /^\s*[{[]/.test(output) ? '' : output.trim();
}
