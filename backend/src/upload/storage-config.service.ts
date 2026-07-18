import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { StorageConfig } from './entities/storage-config.entity';
import { CryptoService } from '../common/crypto/crypto.service';
import {
  StorageConfigView,
  UpdateStorageConfigDto,
} from './dto/storage-config.dto';
import {
  IStorageProvider,
  StorageProviderType,
} from './providers/storage-provider.interface';
import { LocalStorageProvider } from './providers/local.provider';
import { CloudinaryStorageProvider } from './providers/cloudinary.provider';
import { S3StorageProvider } from './providers/s3.provider';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';

/**
 * Owns the storage_config singleton: persistence, encryption of secrets,
 * masked views for the admin UI, and construction of provider instances from
 * either the saved config or ad-hoc credentials (for "Test Connection").
 */
@Injectable()
export class StorageConfigService {
  private readonly logger = new Logger(StorageConfigService.name);

  constructor(
    @InjectRepository(StorageConfig)
    private readonly repo: Repository<StorageConfig>,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  /** Returns the single config row, seeding a `local` default on first run. */
  async getOrCreate(): Promise<StorageConfig> {
    let cfg = await this.repo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (!cfg) {
      cfg = this.repo.create({ provider: 'local', isActive: true });
      cfg = await this.repo.save(cfg);
      this.logger.log('Seeded default storage_config (local provider).');
    }
    return cfg;
  }

  /** Secret-masked view for the admin settings page. */
  async getView(): Promise<StorageConfigView> {
    const cfg = await this.getOrCreate();
    return {
      id: cfg.id,
      provider: cfg.provider,
      isActive: cfg.isActive,
      cloudinaryCloudName: cfg.cloudinaryCloudName,
      cloudinaryApiKey: CryptoService.mask(
        this.crypto.decrypt(cfg.cloudinaryApiKey),
      ),
      cloudinaryApiSecret: CryptoService.mask(
        this.crypto.decrypt(cfg.cloudinaryApiSecret),
      ),
      s3AccessKey: CryptoService.mask(this.crypto.decrypt(cfg.s3AccessKey)),
      s3SecretKey: CryptoService.mask(this.crypto.decrypt(cfg.s3SecretKey)),
      s3Bucket: cfg.s3Bucket,
      s3Region: cfg.s3Region,
      s3Endpoint: cfg.s3Endpoint,
      updatedBy: cfg.updatedBy,
      updatedAt: cfg.updatedAt,
    };
  }

  /** Persist + activate a provider. Empty secrets keep the existing value. */
  async update(
    dto: UpdateStorageConfigDto,
    adminUserId: string,
  ): Promise<StorageConfigView> {
    const cfg = await this.getOrCreate();
    cfg.provider = dto.provider;
    cfg.isActive = dto.isActive ?? true;
    cfg.updatedBy = adminUserId;

    // Non-secret fields: write through directly when provided.
    if (dto.cloudinaryCloudName !== undefined)
      cfg.cloudinaryCloudName = dto.cloudinaryCloudName || null;
    if (dto.s3Bucket !== undefined) cfg.s3Bucket = dto.s3Bucket || null;
    if (dto.s3Region !== undefined) cfg.s3Region = dto.s3Region || null;
    if (dto.s3Endpoint !== undefined) cfg.s3Endpoint = dto.s3Endpoint || null;

    // Secret fields: encrypt when a new value is supplied; otherwise keep.
    cfg.cloudinaryApiKey = this.mergeSecret(
      cfg.cloudinaryApiKey,
      dto.cloudinaryApiKey,
    );
    cfg.cloudinaryApiSecret = this.mergeSecret(
      cfg.cloudinaryApiSecret,
      dto.cloudinaryApiSecret,
    );
    cfg.s3AccessKey = this.mergeSecret(cfg.s3AccessKey, dto.s3AccessKey);
    cfg.s3SecretKey = this.mergeSecret(cfg.s3SecretKey, dto.s3SecretKey);

    await this.repo.save(cfg);
    return this.getView();
  }

  /** Build the provider for the currently saved+active config. */
  async resolveActiveProvider(): Promise<IStorageProvider> {
    const cfg = await this.getOrCreate();
    return this.buildProvider(cfg.provider, this.decryptConfig(cfg));
  }

  /**
   * Build a provider from ad-hoc DTO creds for "Test Connection". Falls back to
   * stored secrets where the DTO leaves a secret blank.
   */
  async buildFromDto(dto: UpdateStorageConfigDto): Promise<IStorageProvider> {
    const cfg = await this.getOrCreate();
    return this.buildProvider(dto.provider, {
      cloudinaryCloudName:
        dto.cloudinaryCloudName ?? cfg.cloudinaryCloudName ?? '',
      cloudinaryApiKey:
        dto.cloudinaryApiKey || this.crypto.decrypt(cfg.cloudinaryApiKey) || '',
      cloudinaryApiSecret:
        dto.cloudinaryApiSecret ||
        this.crypto.decrypt(cfg.cloudinaryApiSecret) ||
        '',
      s3AccessKey:
        dto.s3AccessKey || this.crypto.decrypt(cfg.s3AccessKey) || '',
      s3SecretKey:
        dto.s3SecretKey || this.crypto.decrypt(cfg.s3SecretKey) || '',
      s3Bucket: dto.s3Bucket ?? cfg.s3Bucket ?? '',
      s3Region: dto.s3Region ?? cfg.s3Region ?? '',
      s3Endpoint: dto.s3Endpoint ?? cfg.s3Endpoint ?? '',
    });
  }

  // ── internals ───────────────────────────────────────────────────────────────
  private mergeSecret(
    existing: string | null,
    incoming: string | undefined,
  ): string | null {
    if (incoming === undefined || incoming === '') return existing;
    return this.crypto.encrypt(incoming);
  }

  private decryptConfig(cfg: StorageConfig): DecryptedConfig {
    return {
      cloudinaryCloudName: cfg.cloudinaryCloudName ?? '',
      cloudinaryApiKey: this.crypto.decrypt(cfg.cloudinaryApiKey) ?? '',
      cloudinaryApiSecret: this.crypto.decrypt(cfg.cloudinaryApiSecret) ?? '',
      s3AccessKey: this.crypto.decrypt(cfg.s3AccessKey) ?? '',
      s3SecretKey: this.crypto.decrypt(cfg.s3SecretKey) ?? '',
      s3Bucket: cfg.s3Bucket ?? '',
      s3Region: cfg.s3Region ?? '',
      s3Endpoint: cfg.s3Endpoint ?? '',
    };
  }

  private buildProvider(
    provider: StorageProviderType,
    creds: DecryptedConfig,
  ): IStorageProvider {
    switch (provider) {
      case 'cloudinary':
        return new CloudinaryStorageProvider({
          cloudName:
            creds.cloudinaryCloudName ||
            this.config.get<string>('storage.cloudinary.cloudName') ||
            '',
          apiKey:
            creds.cloudinaryApiKey ||
            this.config.get<string>('storage.cloudinary.apiKey') ||
            '',
          apiSecret:
            creds.cloudinaryApiSecret ||
            this.config.get<string>('storage.cloudinary.apiSecret') ||
            '',
        });
      case 's3':
        return new S3StorageProvider({
          accessKeyId:
            creds.s3AccessKey ||
            this.config.get<string>('storage.s3.accessKeyId') ||
            '',
          secretAccessKey:
            creds.s3SecretKey ||
            this.config.get<string>('storage.s3.secretAccessKey') ||
            '',
          bucket:
            creds.s3Bucket ||
            this.config.get<string>('storage.s3.bucket') ||
            '',
          region:
            creds.s3Region ||
            this.config.get<string>('storage.s3.region') ||
            '',
          endpoint:
            creds.s3Endpoint ||
            this.config.get<string>('storage.s3.endpoint') ||
            undefined,
        });
      case 'local':
        return new LocalStorageProvider({
          uploadDir: this.config.get<string>('storage.local.dir') ?? 'uploads',
          publicBaseUrl:
            this.config.get<string>('app.publicBaseUrl') ??
            'http://localhost:4000',
        });
      default:
        throw new AppException(
          ErrorCode.STORAGE_PROVIDER_NOT_CONFIGURED,
          `Unknown storage provider: ${provider}`,
          HttpStatus.BAD_REQUEST,
        );
    }
  }
}

interface DecryptedConfig {
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3Bucket: string;
  s3Region: string;
  s3Endpoint: string;
}
