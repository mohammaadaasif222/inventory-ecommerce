import { HttpStatus, Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';
import { UploadResult } from './providers/storage-provider.interface';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';

export interface UploadValidation {
  /** Allowed mimetypes; supports wildcards like 'image/*'. */
  allowed?: string[];
  /** Max size in bytes. */
  maxSize?: number;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const IMAGE_TYPES = ['image/*'];

/**
 * Public upload entry point used by feature modules (avatars, product galleries,
 * chat attachments). Validates the file then delegates to the active provider.
 */
@Injectable()
export class UploadService {
  constructor(private readonly storage: StorageService) {}

  async uploadOne(
    file: Express.Multer.File,
    folder: string,
    validation: UploadValidation = {},
  ): Promise<UploadResult> {
    this.validate(file, validation);
    return this.storage.upload(file, folder);
  }

  async uploadMany(
    files: Express.Multer.File[],
    folder: string,
    validation: UploadValidation = {},
  ): Promise<UploadResult[]> {
    return Promise.all(files.map((f) => this.uploadOne(f, folder, validation)));
  }

  /** Convenience used by avatar/product image flows. */
  uploadImage(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    return this.uploadOne(file, folder, {
      allowed: IMAGE_TYPES,
      maxSize: 5 * 1024 * 1024,
    });
  }

  delete(storageId: string): Promise<void> {
    return this.storage.delete(storageId);
  }

  private validate(file: Express.Multer.File, v: UploadValidation): void {
    if (!file) {
      throw new AppException(
        ErrorCode.UPLOAD_FAILED,
        'No file received',
        HttpStatus.BAD_REQUEST,
      );
    }
    const maxSize = v.maxSize ?? DEFAULT_MAX_SIZE;
    if (file.size > maxSize) {
      throw new AppException(
        ErrorCode.FILE_TOO_LARGE,
        `File exceeds the ${Math.round(maxSize / 1024 / 1024)}MB limit`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    if (v.allowed && v.allowed.length > 0 && !this.typeAllowed(file.mimetype, v.allowed)) {
      throw new AppException(
        ErrorCode.UNSUPPORTED_FILE_TYPE,
        `Unsupported file type: ${file.mimetype}`,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }
  }

  private typeAllowed(mimetype: string, allowed: string[]): boolean {
    return allowed.some((pattern) => {
      if (pattern.endsWith('/*')) {
        return mimetype.startsWith(pattern.slice(0, -1));
      }
      return pattern === mimetype;
    });
  }
}
