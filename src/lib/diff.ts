export type DiffSegment = { type: 'same' | 'del' | 'ins'; text: string };

function tokenize(s: string): string[] {
  return s.match(/\s+|[\p{L}\p{N}’'-]+|[^\s\p{L}\p{N}]/gu) ?? [];
}

/**
 * Diff mot à mot (LCS) pour afficher une rature : texte barré / texte ajouté.
 * Borné pour rester instantané sur des extraits de quelques phrases.
 */
export function diffWords(a: string, b: string): DiffSegment[] {
  const x = tokenize(a);
  const y = tokenize(b);
  if (x.length * y.length > 250_000) {
    return [
      { type: 'del', text: a },
      { type: 'ins', text: b },
    ];
  }
  const dp: number[][] = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffSegment[] = [];
  const push = (type: DiffSegment['type'], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) {
      push('same', x[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push('del', x[i++]);
    else push('ins', y[j++]);
  }
  while (i < x.length) push('del', x[i++]);
  while (j < y.length) push('ins', y[j++]);
  return out;
}
