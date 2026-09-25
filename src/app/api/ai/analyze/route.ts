import { NextResponse } from 'next/server';
import { analyzeRequest, analyzeResponse } from '@/lib/ai/contracts';
import { aiError, guard, isResponse, parseJson, upstreamFailure } from '@/server/handler';
import { generate, parseJsonLoose } from '@/server/gemini';
import { ANALYZE_SCHEMA, ANALYZE_STYLE, wrapManuscript } from '@/server/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await guard(req, 1);
  if (isResponse(ctx)) return ctx;
  const body = await parseJson(req, analyzeRequest);
  if (isResponse(body)) return body;

  try {
    const result = await generate({
      family: body.scope === 'chapter' ? 'text' : 'fast',
      apiKey: ctx.apiKey,
      systemInstruction: ANALYZE_STYLE,
      json: true,
      responseSchema: ANALYZE_SCHEMA,
      temperature: 0.3,
      parts: [{ text: wrapManuscript(body.text, body.context) }],
    });
    const parsed = analyzeResponse.safeParse(parseJsonLoose(result.text));
    if (!parsed.success) return aiError('bad_output', 'Réponse IA inexploitable, réessayez.', 502);
    // Ne garder que les suggestions qui citent réellement le texte.
    const suggestions = parsed.data.suggestions.filter(
      (s) => s.original !== s.replacement && body.text.includes(s.original),
    );
    return NextResponse.json({ ...parsed.data, suggestions });
  } catch (err) {
    return upstreamFailure(err);
  }
}
