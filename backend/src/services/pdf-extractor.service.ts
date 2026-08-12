import { PDFParse } from "pdf-parse";

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

export const extractPdfText = async (
  buffer: Buffer,
): Promise<ExtractedPage[]> => {
  const parser = new PDFParse({
    data: buffer,
  });

  try {
    const result = await parser.getText();

    return result.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text.trim(),
    }));
  } finally {
    await parser.destroy();
  }
};
