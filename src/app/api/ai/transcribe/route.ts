import { NextResponse } from 'next/server';
import { ALLOWED_AUDIO_TYPES, MAX_AUDIO_BYTES, transcribeFields, transcribeResponse } from '@/lib/ai/contracts';
import { aiError, guard, isResponse, upstreamFailure } from '@/server/handler';
import { generate, parseJsonLoose, salvageText } from '@/server/gemini';
import { TRANSCRIBE_CLEAN, TRANSCRIBE_SCHEMA, TRANSCRIBE_VERBATIM, wrapManuscript } from '@/server/prompts';
import { detectAudioMime } from '@/server/audio';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await guard(req, 2);
  if (isResponse(ctx)) return ctx;

  if (Number(req.headers.get('content-length') ?? 0) > MAX_AUDIO_BYTES + 16_000) {
    return aiError('payload_too_large', 'Enregistrement trop long : dictez par séquences de quelques minutes.', 413);
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return aiError('bad_request', 'Requête invalide.', 400);
  }
  const file = form.get('audio');
  if (!(file instanceof Blob) || file.size === 0) return aiError('bad_request', 'Aucun audio reçu.', 400);
  if (file.size > MAX_AUDIO_BYTES) return aiError('payload_too_large', 'Enregistrement trop long.', 413);

  const fields = transcribeFields.safeParse({
    context: form.get('context') ?? undefined,
    mode: form.get('mode') ?? undefined,
  });
  if (!fields.success) return aiError('bad_request', 'Paramètres invalides.', 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectAudioMime(bytes, file.type);
  if (!(ALLOWED_AUDIO_TYPES as readonly string[]).includes(mimeType)) {
    return aiError('bad_request', 'Format audio non pris en charge.', 415);
  }

  try {
    const result = await generate({
      family: 'audio',
      apiKey: ctx.apiKey,
      systemInstruction: fields.data.mode === 'verbatim' ? TRANSCRIBE_VERBATIM : TRANSCRIBE_CLEAN,
      json: true,
      responseSchema: TRANSCRIBE_SCHEMA,
      temperature: 0.1,
      maxOutputTokens: 8192,
      parts: [
        ...(fields.data.context ? [{ text: `Fin du texte précédent, pour la cohérence :\n${wrapManuscript(fields.data.context)}` }] : []),
        { inlineData: { mimeType, data: Buffer.from(bytes).toString('base64') } },
      ],
    });
    let raw: unknown = null;
    try {
      raw = parseJsonLoose(result.text);
    } catch {}
    const parsed = transcribeResponse.safeParse(raw);
    if (parsed.success) return NextResponse.json(parsed.data);
    // Filet de sécurité : ne jamais perdre une dictée si le JSON est malformé ou tronqué.
    return NextResponse.json({ text: salvageText(result.text), revisions: [] });
  } catch (err) {
    return upstreamFailure(err);
  }
}
