import { mkdir, unlink, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { StorageService, UploadFileInput } from "./storage.service.js";

const uploadDirectory = path.resolve(process.cwd(), "uploads", "documents");

export const localStorageService: StorageService = {
  async upload(input: UploadFileInput): Promise<string> {
    await mkdir(uploadDirectory, { recursive: true });

    const storageKey = `documents/${randomUUID()}.pdf`;

    const filePath = path.join(uploadDirectory, path.basename(storageKey));

    await writeFile(filePath, input.buffer);

    return storageKey;
  },

  async delete(storageKey: string): Promise<void> {
    const fileName = path.basename(storageKey);
    const filePath = path.join(uploadDirectory, fileName);

    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  },
  
  async download(storageKey: string): Promise<Buffer> {
    const fileName = path.basename(storageKey);
    const filePath = path.join(uploadDirectory, fileName);

    try {
      return await readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error("Stored file not found.");
      }

      throw error;
    }
  },
};
