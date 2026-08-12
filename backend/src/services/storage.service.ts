export type UploadFileInput = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
};

export interface StorageService {
  upload(input: UploadFileInput): Promise<string>;
  download(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}
