import { NextResponse } from 'next/server';
import { researchRequest } from '@/lib/ai/contracts';
import { guard, isResponse, parseJson, upstreamFailure } from '@/server/handler';
import { generate } from '@/server/gemini';
import { RESEARCH, wrapManuscript } from '@/server/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await guard(req, 2);
  if (isResponse(ctx)) return ctx;
  const body = await parseJson(req, researchRequest);
  if (isResponse(body)) return body;

  try {
    const result = await generate({
      family: 'grounded',
      apiKey: ctx.apiKey,
      systemInstruction: RESEARCH,
      googleSearch: true,
      temperature: 0.3,
      maxOutputTokens: 4096,
      parts: [{ text: `Sujet de recherche : ${body.query}\n${body.context ? wrapManuscript(body.context) : ''}` }],
    });
    const report = result.text.slice(0, 20_000);
    const lines = report
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const summary = lines.find((l) => !l.startsWith('#') && !/^[-*•]/.test(l)) ?? '';
    const keyPoints = lines
      .filter((l) => /^[-*•]\s+/.test(l))
      .map((l) => l.replace(/^[-*•]\s+/, '').replace(/\*\*/g, ''))
      .slice(0, 8);
    return NextResponse.json({ summary, keyPoints, report, sources: result.sources, searchWidgetHtml: result.searchWidgetHtml });
  } catch (err) {
    return upstreamFailure(err);
  }
}
