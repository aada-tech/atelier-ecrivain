import { NextResponse } from 'next/server';
import { coverRequest } from '@/lib/ai/contracts';
import { aiError, guard, isResponse, parseJson, upstreamFailure } from '@/server/handler';
import { generate } from '@/server/gemini';
import { coverPrompt } from '@/server/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await guard(req, 4);
  if (isResponse(ctx)) return ctx;
  const body = await parseJson(req, coverRequest, 8_000);
  if (isResponse(body)) return body;

  try {
    const result = await generate({
      family: 'image',
      apiKey: ctx.apiKey,
      imageOutput: true,
      temperature: 0.9,
      timeoutMs: 55_000,
      parts: [{ text: coverPrompt(body.prompt, body.title, body.style) }],
    });
    const image = result.images[0];
    if (!image) return aiError('bad_output', 'Aucune image générée, reformulez la description.', 502);
    if (!/^image\/(png|jpeg|webp)$/.test(image.mimeType)) return aiError('bad_output', 'Format d’image inattendu.', 502);
    return NextResponse.json({ dataUrl: `data:${image.mimeType};base64,${image.data}` });
  } catch (err) {
    return upstreamFailure(err);
  }
}
