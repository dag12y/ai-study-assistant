import { describe, expect, it, vi } from "vitest";

vi.mock("cohere-ai", () => ({
  CohereClientV2: class {
    async embed() {
      return {
        embeddings: {
          float: [Array.from({ length: 512 }, () => 0.1)],
        },
      };
    }
  },
}));

import { generateDocumentEmbedding } from "../src/services/embedding.service.js";

describe("Document embeddings", () => {
  it("should generate a 512-dimensional embedding", async () => {
    const embedding = await generateDocumentEmbedding(
      "Machine learning is a field of artificial intelligence.",
    );

    expect(embedding).toHaveLength(512);
    expect(embedding.every((value) => typeof value === "number")).toBe(true);
  });

  it("should generate an embedding for Amharic text", async () => {
    const embedding = await generateDocumentEmbedding(
      "ማሽን ለርኒንግ የሰው ልጅ እውቀትን ለመማር የሚጠቀም የሰው ሰራሽ እውቀት ዘርፍ ነው።",
    );

    expect(embedding).toHaveLength(512);
    expect(embedding.every((value) => typeof value === "number")).toBe(true);
  });
});
