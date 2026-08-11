export type UploadFileInput = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
};

export type StorageService = {
  upload: (input: UploadFileInput) => Promise<string>;
  delete: (storageKey: string) => Promise<void>;
};
