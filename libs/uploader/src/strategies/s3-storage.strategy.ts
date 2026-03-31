import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

export class S3StorageStrategy implements FileStorageStrategy {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async upload(input: FileUploadInput): Promise<UploadedFileResult> {
    const key = this.buildKey(input);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );

    return {
      key,
      location: `s3://${this.bucket}/${key}`,
    };
  }

  async download(input: DownloadFileInput): Promise<DownloadedFileResult> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: input.key,
        }),
      );
      const byteArray = await response.Body?.transformToByteArray();
      const buffer = Buffer.from(byteArray ?? []);

      return {
        buffer,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`File not found: ${input.key}`);
      }
      throw error;
    }
  }

  async getDownloadUrl(input: DownloadUrlInput): Promise<DownloadUrlResult> {
    const expiresIn = input.expiresIn ?? 900;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return { url, expiresIn };
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`File not found: ${input.key}`);
      }
      throw error;
    }
  }

  private buildKey(input: FileUploadInput): string {
    return input.directory ? `${input.directory}/${input.filename}` : input.filename;
  }

  private isNotFoundError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
      return false;
    }

    if ("name" in error && error.name === "NoSuchKey") {
      return true;
    }

    if ("$metadata" in error && typeof error.$metadata === "object") {
      const metadata = error.$metadata as { httpStatusCode?: number };
      return metadata.httpStatusCode === 404;
    }

    return false;
  }
}
