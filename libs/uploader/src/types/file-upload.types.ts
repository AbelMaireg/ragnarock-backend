export interface FileUploadInput {
  buffer: Buffer;
  filename: string;
  contentType?: string;
  directory?: string;
}

export interface UploadedFileResult {
  key: string;
  location: string;
}

export interface DownloadFileInput {
  key: string;
}

export interface DownloadedFileResult {
  buffer: Buffer;
  contentType?: string;
  contentLength?: number;
}

export interface DownloadUrlInput extends DownloadFileInput {
  expiresIn?: number;
}

export interface DownloadUrlResult {
  url: string;
  expiresIn?: number;
}
