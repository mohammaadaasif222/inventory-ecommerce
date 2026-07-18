import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * AES-256-GCM encryption for sensitive config persisted in the database
 * (e.g. storage-provider API secrets). The key comes from CONFIG_ENCRYPTION_KEY
 * (32-byte hex). Ciphertext is stored as: iv:authTag:cipher (all hex).
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly config: ConfigService) {
    const hexKey = this.config.get<string>('security.configEncryptionKey');
    if (!hexKey || hexKey.length !== 64) {
      throw new Error(
        'CONFIG_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).',
      );
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  /** Encrypt plaintext. Returns null/empty for empty input (nothing to hide). */
  encrypt(plaintext: string | null | undefined): string | null {
    if (plaintext === null || plaintext === undefined || plaintext === '') {
      return null;
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /** Decrypt ciphertext produced by encrypt(). Returns null on empty/invalid. */
  decrypt(ciphertext: string | null | undefined): string | null {
    if (!ciphertext) return null;
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      this.logger.warn('Malformed ciphertext encountered during decrypt.');
      return null;
    }
    try {
      const [ivHex, tagHex, dataHex] = parts;
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(ivHex, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch (err) {
      this.logger.error('Failed to decrypt config value', err as Error);
      return null;
    }
  }

  /** Mask a secret for safe display in admin UIs (keeps last 4 chars). */
  static mask(value: string | null | undefined): string {
    if (!value) return '';
    if (value.length <= 4) return '••••';
    return `••••••••${value.slice(-4)}`;
  }
}
