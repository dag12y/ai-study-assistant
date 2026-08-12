export type ChunkInput = {
  pageNumber: number;
  text: string;
};

export type DocumentChunk = {
  content: string;
  pageNumber: number;
  chunkIndex: number;
};

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

export const chunkDocument = (
  pages: ChunkInput[],
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): DocumentChunk[] => {
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0.");
  }

  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error(
      "overlap must be greater than or equal to 0 and less than chunkSize.",
    );
  }

  const chunks: DocumentChunk[] = [];

  for (const page of pages) {
    const text = page.text.trim();

    if (!text) {
      continue;
    }

    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);

      const content = text.slice(start, end).trim();

      if (content) {
        chunks.push({
          content,
          pageNumber: page.pageNumber,
          chunkIndex: chunks.length,
        });
      }
      if (end === text.length) {
        break;
      }
      start = end - overlap;
    }
  }
  return chunks;
};
