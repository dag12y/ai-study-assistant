import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { extractPdfText } from "../src/services/pdf-extractor.service.js";

describe("PDF extractor", () => {
  const pdfPath = path.resolve(
    process.cwd(),
    "tests/fixtures/amharic-test.pdf",
  );

  it("should extract text from a two-page Amharic PDF", async () => {
    const buffer = await readFile(pdfPath);

    const pages = await extractPdfText(buffer);

    expect(pages).toHaveLength(2);

    expect(pages[0]).toMatchObject({
      pageNumber: 1,
    });

    expect(pages[1]).toMatchObject({
      pageNumber: 2,
    });

    expect(pages[0].text.trim()).not.toBe("");
    expect(pages[1].text.trim()).not.toBe("");
  });

  it("should preserve Amharic Unicode text", async () => {
    const buffer = await readFile(pdfPath);

    const pages = await extractPdfText(buffer);

    const extractedText = pages.map((page) => page.text).join("\n");

    // Ethiopic Unicode block: U+1200–U+137F
    expect(extractedText).toMatch(/[\u1200-\u137F]/);
  });

  it("should reject invalid PDF data", async () => {
    const invalidPdf = Buffer.from("This is not a PDF");

    await expect(extractPdfText(invalidPdf)).rejects.toThrow();
  });
});
