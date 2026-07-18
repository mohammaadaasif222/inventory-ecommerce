import { promises as fs } from 'fs';
import { join, posix } from 'path';
import { randomUUID } from 'crypto';
import { HttpStatus } from '@nestjs/common';
import {
  IStorageProvider,
  StorageProviderType,
  UploadResult,
} from './storage-provider.interface';
import { AppException, ErrorCode } from '../../common/exceptions/app.exception';

export interface LocalProviderConfig {
  /** Absolute or cwd-relative directory where files are written. */
  uploadDir: string;
  /** Base URL the static middleware serves /uploads from. */
  publicBaseUrl: string;
}

/** Filesystem-backed provider for development / fallback. */
export class LocalStorageProvider implements IStorageProvider {
  readonly type: StorageProviderType = 'local';

  constructor(private readonly config: LocalProviderConfig) {}

  private get root(): string {
    return join(process.cwd(), this.config.uploadDir);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
    const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
    const filename = ext ? `${randomUUID()}.${ext}` : randomUUID();
    const dir = join(this.root, safeFolder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, filename), file.buffer);

    const relPath = posix.join(safeFolder, filename);
    const dims = this.imageDimensions(file);
    return {
      url: `${this.config.publicBaseUrl}/uploads/${relPath}`,
      storageId: relPath,
      provider: this.type,
      folder: safeFolder,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      ...dims,
    };
  }

  async deleteFile(identifier: string): Promise<void> {
    const target = join(this.root, identifier);
    // Guard against path traversal outside the upload root.
    if (!target.startsWith(this.root)) {
      throw new AppException(
        ErrorCode.UPLOAD_FAILED,
        'Invalid file identifier',
        HttpStatus.BAD_REQUEST,
      );
    }
    await fs.rm(target, { force: true });
  }

  async testConnection(): Promise<void> {
    try {
      await fs.mkdir(this.root, { recursive: true });
      const probe = join(this.root, `.probe-${randomUUID()}`);
      await fs.writeFile(probe, 'ok');
      await fs.rm(probe, { force: true });
    } catch (err) {
      throw new AppException(
        ErrorCode.STORAGE_CONNECTION_FAILED,
        `Local upload directory is not writable: ${String(err)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** Best-effort PNG/GIF/JPEG dimension read without an image library. */
  private imageDimensions(
    file: Express.Multer.File,
  ): { width?: number; height?: number } {
    const b = file.buffer;
    if (!b || b.length < 24) return {};
    // PNG
    if (b.toString('ascii', 1, 4) === 'PNG') {
      return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    }
    // GIF
    if (b.toString('ascii', 0, 3) === 'GIF') {
      return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
    }
    return {};
  }
}
