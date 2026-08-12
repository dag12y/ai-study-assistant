import { describe, expect, it } from "vitest";

import { chunkDocument } from "../src/services/document-chunking.service.js";

describe("Document chunking", () => {
  it("should split a document into chunks", () => {
    const pages = [
      {
        pageNumber: 1,
        text: "A".repeat(2500),
      },
    ];

    const chunks = chunkDocument(pages, 1000, 200);

    expect(chunks.length).toBe(3);

    expect(chunks[0]).toMatchObject({
      pageNumber: 1,
      chunkIndex: 0,
    });

    expect(chunks[0].content).toHaveLength(1000);
    expect(chunks[1].content).toHaveLength(1000);
    expect(chunks[2].content).toHaveLength(900);
  });

  it("should preserve page numbers", () => {
    const pages = [
      {
        pageNumber: 1,
        text: "First page",
      },
      {
        pageNumber: 2,
        text: "Second page",
      },
    ];

    const chunks = chunkDocument(pages, 1000, 200);

    expect(chunks).toHaveLength(2);

    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[1].pageNumber).toBe(2);
  });

  it("should assign sequential chunk indexes", () => {
    const pages = [
      {
        pageNumber: 1,
        text: "First page",
      },
      {
        pageNumber: 2,
        text: "Second page",
      },
    ];

    const chunks = chunkDocument(pages, 5, 1);

    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(
      chunks.map((_, index) => index),
    );
  });

  it("should skip empty pages", () => {
    const pages = [
      {
        pageNumber: 1,
        text: "   ",
      },
      {
        pageNumber: 2,
        text: "Some useful content",
      },
    ];

    const chunks = chunkDocument(pages);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].pageNumber).toBe(2);
  });

  it("should trim chunk content", () => {
    const pages = [
      {
        pageNumber: 1,
        text: "   Hello world   ",
      },
    ];

    const chunks = chunkDocument(pages);

    expect(chunks[0].content).toBe("Hello world");
  });

  it("should reject an invalid chunk size", () => {
    expect(() =>
      chunkDocument([{ pageNumber: 1, text: "Hello" }], 0, 0),
    ).toThrow();
  });

  it("should reject an overlap greater than or equal to the chunk size", () => {
    expect(() =>
      chunkDocument([{ pageNumber: 1, text: "Hello" }], 100, 100),
    ).toThrow();

    expect(() =>
      chunkDocument([{ pageNumber: 1, text: "Hello" }], 100, 150),
    ).toThrow();
  });
});
