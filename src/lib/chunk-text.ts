// chunk-text.ts — pure text chunking for document ingestion into the assistant
// context store. Splits long text into ~`size`-char chunks with a little `overlap`
// so a fact spanning a boundary isn't lost. Prefers to break on paragraph/sentence
// boundaries near the target size. Unit-tested; no I/O.

export function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      // Prefer a paragraph break, then a sentence/newline, within the last 40%.
      const window = clean.slice(start, end);
      const floor = Math.floor(size * 0.6);
      const para = window.lastIndexOf("\n\n");
      const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("\n"));
      const cut = para >= floor ? para : sentence >= floor ? sentence + 1 : -1;
      if (cut > 0) end = start + cut;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
