import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

@Injectable()
export class IntegrationsCredentialsService {
  constructor(private readonly configService: ConfigService) {}

  private getKey(): Buffer {
    const secret = this.configService.get<string>("integrations.credentialsSecret", "");
    if (!secret || secret.length < 16) {
      throw new BadRequestException(
        "INTEGRATIONS_CREDENTIALS_SECRET is not configured or too short (min 16 characters)",
      );
    }
    return createHash("sha256").update(secret, "utf8").digest();
  }

  encryptPayload(payload: Record<string, unknown>): string {
    try {
      const key = this.getKey();
      const iv = randomBytes(IV_LEN);
      const cipher = createCipheriv(ALGO, key, iv);
      const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException("Could not encrypt integration credentials");
    }
  }

  decryptPayload(blob: string): Record<string, unknown> {
    try {
      const key = this.getKey();
      const raw = Buffer.from(blob, "base64url");
      const iv = raw.subarray(0, IV_LEN);
      const tag = raw.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
      const data = raw.subarray(IV_LEN + AUTH_TAG_LEN);
      const decipher = createDecipheriv(ALGO, key, iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
      return JSON.parse(plain) as Record<string, unknown>;
    } catch {
      throw new BadRequestException("Stored credentials could not be decrypted");
    }
  }
}
