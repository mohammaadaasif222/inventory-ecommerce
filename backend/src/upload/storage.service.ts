import { HttpStatus, Injectable } from '@nestjs/common';
import { StorageConfigService } from './storage-config.service';
import {
  IStorageProvider,
  PresignedUpload,
  PresignOptions,
  UploadResult,
} from './providers/storage-provider.interface';
import {
  StorageConfigView,
  UpdateStorageConfigDto,
} from './dto/storage-config.dto';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';

/**
 * Runtime-switchable storage facade. Resolves the active provider from the DB
 * config (cached until the config is updated) and proxies file operations.
 */
@Injectable()
export class StorageService {
  private cached: IStorageProvider | null = null;

  constructor(private readonly configService: StorageConfigService) {}

  private async provider(): Promise<IStorageProvider> {
    if (!this.cached) {
      this.cached = await this.configService.resolveActiveProvider();
    }
    return this.cached;
  }

  /** Drop the cached provider after a config change. */
  invalidate(): void {
    this.cached = null;
  }

  async upload(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    return (await this.provider()).uploadFile(file, folder);
  }

  async delete(storageId: string): Promise<void> {
    return (await this.provider()).deleteFile(storageId);
  }

  async presign(opts: PresignOptions): Promise<PresignedUpload> {
    const provider = await this.provider();
    if (!provider.getPresignedUpload) {
      throw new AppException(
        ErrorCode.PRESIGNED_NOT_SUPPORTED,
        `Provider "${provider.type}" does not support presigned uploads`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return provider.getPresignedUpload(opts);
  }

  async signedReadUrl(key: string, expiresIn: number): Promise<string> {
    const provider = await this.provider();
    if (!provider.getSignedUrl) {
      throw new AppException(
        ErrorCode.PRESIGNED_NOT_SUPPORTED,
        `Provider "${provider.type}" does not support signed read URLs`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return provider.getSignedUrl(key, expiresIn);
  }

  // ── admin config passthrough ────────────────────────────────────────────────
  getConfigView(): Promise<StorageConfigView> {
    return this.configService.getView();
  }

  async updateConfig(
    dto: UpdateStorageConfigDto,
    adminUserId: string,
  ): Promise<StorageConfigView> {
    const view = await this.configService.update(dto, adminUserId);
    this.invalidate();
    return view;
  }

  /** Run a real connectivity check against the given (or saved) provider. */
  async testConnection(
    dto: UpdateStorageConfigDto,
  ): Promise<{ ok: true; provider: string }> {
    const provider = await this.configService.buildFromDto(dto);
    await provider.testConnection();
    return { ok: true, provider: provider.type };
  }
}
