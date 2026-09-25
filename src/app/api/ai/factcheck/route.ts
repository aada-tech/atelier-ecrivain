import { NextResponse } from 'next/server';
import { z } from 'zod';
import { factClaim, factcheckRequest } from '@/lib/ai/contracts';
import { aiError, guard, isResponse, parseJson, upstreamFailure } from '@/server/handler';
import { generate, parseJsonLoose } from '@/server/gemini';
import { FACTCHECK, wrapManuscript } from '@/server/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

const claimsOnly = z.object({ claims: z.array(factClaim).max(12) });

export async function POST(req: Request) {
  const ctx = await guard(req, 2);
  if (isResponse(ctx)) return ctx;
  const body = await parseJson(req, factcheckRequest);
  if (isResponse(body)) return body;

  try {
    const result = await generate({
      family: 'grounded',
      apiKey: ctx.apiKey,
      systemInstruction: FACTCHECK,
      googleSearch: true,
      temperature: 0.1,
      parts: [{ text: wrapManuscript(body.text) }],
    });
    let raw: unknown;
    try {
      raw = parseJsonLoose(result.text);
    } catch {
      return aiError('bad_output', 'Réponse IA inexploitable, réessayez.', 502);
    }
    const parsed = claimsOnly.safeParse(Array.isArray(raw) ? { claims: raw } : raw);
    if (!parsed.success) return aiError('bad_output', 'Réponse IA inexploitable, réessayez.', 502);
    const grounded = result.sources.length > 0;
    // Sans source réelle, aucune affirmation ne peut être déclarée « confirmée ».
    const claims = parsed.data.claims.map((c) =>
      grounded ? c : { ...c, verdict: c.verdict === 'error' ? ('caution' as const) : ('unverified' as const) },
    );
    return NextResponse.json({ claims, sources: result.sources, searchWidgetHtml: result.searchWidgetHtml, grounded });
  } catch (err) {
    return upstreamFailure(err);
  }
}
