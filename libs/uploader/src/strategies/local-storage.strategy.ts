import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { NotFoundException } from "@nestjs/common";
import { FileStorageStrategy } from "./file-storage.strategy";
import {
  DownloadedFileResult,
  DownloadFileInput,
  DownloadUrlInput,
  DownloadUrlResult,
  FileUploadInput,
  UploadedFileResult,
} from "../types/file-upload.types";

export class LocalStorageStrategy implements FileStorageStrategy {
  constructor(private readonly rootDir: string) {}

  async upload(input: FileUploadInput): Promise<UploadedFileResult> {
    const key = this.buildKey(input);
    const filePath = join(this.rootDir, key);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, input.buffer);

    return {
      key,
      location: filePath,
    };
  }

  async download(input: DownloadFileInput): Promise<DownloadedFileResult> {
    const filePath = join(this.rootDir, input.key);

    try {
      const buffer = await readFile(filePath);
      return {
        buffer,
        contentLength: buffer.length,
      };
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`File not found: ${input.key}`);
      }
      throw error;
    }
  }

  async getDownloadUrl(input: DownloadUrlInput): Promise<DownloadUrlResult> {
    const filePath = join(this.rootDir, input.key);

    try {
      await readFile(filePath);
      return {
        url: `file://${filePath}`,
      };
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`File not found: ${input.key}`);
      }
      throw error;
    }
  }

  private buildKey(input: FileUploadInput): string {
    return input.directory ? join(input.directory, input.filename) : input.filename;
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
    );
  }
}
