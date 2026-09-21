/* Splits a paragraph into everything before its final sentence and
   that final sentence, the clause the marker stroke sweeps over. A
   sentence ends at . ! or ? followed by whitespace and more text, so
   decimals like 0.01 never cut a sentence. */
export function splitFinalSentence(text: string): {
  body: string;
  final: string;
} {
  const trimmed = text.trim();
  let cut = -1;
  for (let i = 0; i < trimmed.length - 1; i += 1) {
    const char = trimmed[i];
    if (char !== "." && char !== "!" && char !== "?") {
      continue;
    }
    if (!/\s/.test(trimmed[i + 1])) {
      continue;
    }
    if (trimmed.slice(i + 1).trim().length === 0) {
      continue;
    }
    cut = i;
  }
  if (cut < 0) {
    return { body: "", final: trimmed };
  }
  return {
    body: trimmed.slice(0, cut + 1).trim(),
    final: trimmed.slice(cut + 1).trim(),
  };
}