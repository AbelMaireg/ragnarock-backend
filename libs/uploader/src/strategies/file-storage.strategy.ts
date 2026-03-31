import {
  DownloadedFileResult,
  DownloadFileInput,
  DownloadUrlInput,
  DownloadUrlResult,
  FileUploadInput,
  UploadedFileResult,
} from "../types/file-upload.types";

export interface FileStorageStrategy {
  upload(input: FileUploadInput): Promise<UploadedFileResult>;
  download(input: DownloadFileInput): Promise<DownloadedFileResult>;
  getDownloadUrl(input: DownloadUrlInput): Promise<DownloadUrlResult>;
}
