import { Inject, Injectable } from "@nestjs/common";
import { FILE_STORAGE_STRATEGY } from "./uploader.tokens";
import { FileStorageStrategy } from "./strategies/file-storage.strategy";
import {
  DownloadedFileResult,
  DownloadFileInput,
  DownloadUrlInput,
  DownloadUrlResult,
  FileUploadInput,
  UploadedFileResult,
} from "./types/file-upload.types";

@Injectable()
export class UploaderService {
  constructor(
    @Inject(FILE_STORAGE_STRATEGY)
    private readonly storageStrategy: FileStorageStrategy,
  ) {}

  upload(input: FileUploadInput): Promise<UploadedFileResult> {
    return this.storageStrategy.upload(input);
  }

  download(input: DownloadFileInput): Promise<DownloadedFileResult> {
    return this.storageStrategy.download(input);
  }

  getDownloadUrl(input: DownloadUrlInput): Promise<DownloadUrlResult> {
    return this.storageStrategy.getDownloadUrl(input);
  }
}
