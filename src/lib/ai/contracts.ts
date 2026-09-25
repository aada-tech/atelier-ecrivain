import { z } from 'zod';

/**
 * Contrats d'échange entre le navigateur et le proxy /api/ai/*.
 * Validés côté serveur (entrée ET sortie du modèle) ; côté client seuls les
 * types sont importés.
 */

export const MAX_TEXT_CHARS = 24_000;
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // < limite de 4,5 Mo des fonctions Vercel
export const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac'] as const;

const text = (max = MAX_TEXT_CHARS) => z.string().trim().min(1).max(max);

export const analyzeRequest = z.object({
  text: text(),
  scope: z.enum(['selection', 'paragraph', 'chapter']).default('paragraph'),
  context: z.string().max(2_000).optional(),
});
export type AnalyzeRequest = z.infer<typeof analyzeRequest>;

export const factcheckRequest = z.object({ text: text(8_000) });
export type FactcheckRequest = z.infer<typeof factcheckRequest>;

export const researchRequest = z.object({
  query: text(500),
  context: z.string().max(2_000).optional(),
});
export type ResearchRequest = z.infer<typeof researchRequest>;

export const coverRequest = z.object({
  prompt: text(600),
  title: z.string().max(200).default(''),
  style: z.enum(['editorial', 'illustration', 'photo', 'minimal', 'vintage']).default('editorial'),
});
export type CoverRequest = z.infer<typeof coverRequest>;

export const transcribeFields = z.object({
  context: z.string().max(1_500).optional(),
  mode: z.enum(['clean', 'verbatim']).default('clean'),
});

// ── Réponses ────────────────────────────────────────────────────────────

const source = z.object({ title: z.string(), uri: z.string() });

export const styleSuggestion = z.object({
  original: z.string().min(1).max(5_000),
  replacement: z.string().max(5_000),
  explanation: z.string().max(600).default(''),
  category: z.enum(['style', 'repetition', 'clarity', 'grammar', 'rhythm', 'typography']).catch('style'),
});

export const analyzeResponse = z.object({
  suggestions: z.array(styleSuggestion).max(12),
  summary: z.string().max(600).default(''),
});
export type AnalyzeResponse = z.infer<typeof analyzeResponse>;

export const factClaim = z.object({
  claim: z.string().min(1).max(2_000),
  verdict: z.enum(['confirmed', 'caution', 'error', 'unverified']).catch('unverified'),
  explanation: z.string().max(1_200).default(''),
  correction: z.string().max(2_000).default(''),
});

export const factcheckResponse = z.object({
  claims: z.array(factClaim).max(12),
  sources: z.array(source).max(12),
  searchWidgetHtml: z.string().optional(),
  grounded: z.boolean(),
});
export type FactcheckResponse = z.infer<typeof factcheckResponse>;

export const researchResponse = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).max(10),
  report: z.string(),
  sources: z.array(source).max(12),
  searchWidgetHtml: z.string().optional(),
});
export type ResearchResponse = z.infer<typeof researchResponse>;

export const transcribeResponse = z.object({
  text: z.string(),
  revisions: z
    .array(
      z.object({
        original: z.string().max(2_000),
        replacement: z.string().max(2_000),
        explanation: z.string().max(600).default(''),
      }),
    )
    .max(10)
    .default([]),
});
export type TranscribeResponse = z.infer<typeof transcribeResponse>;

export const coverResponse = z.object({
  dataUrl: z.string().startsWith('data:image/'),
});
export type CoverResponse = z.infer<typeof coverResponse>;

export interface AiErrorBody {
  error: { code: AiErrorCode; message: string; retryAfter?: number };
}

export type AiErrorCode =
  | 'unauthenticated'
  | 'bad_request'
  | 'payload_too_large'
  | 'rate_limited'
  | 'no_key'
  | 'upstream_quota'
  | 'upstream_blocked'
  | 'upstream_error'
  | 'bad_output';
