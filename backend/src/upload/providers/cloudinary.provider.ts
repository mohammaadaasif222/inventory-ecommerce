import { HttpStatus } from '@nestjs/common';
import {
  v2 as cloudinary,
  ConfigOptions,
  UploadApiResponse,
} from 'cloudinary';
import {
  IStorageProvider,
  StorageProviderType,
  UploadResult,
} from './storage-provider.interface';
import { AppException, ErrorCode } from '../../common/exceptions/app.exception';

export interface CloudinaryProviderConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** Cloudinary-backed provider with folder organisation + delivery transforms. */
export class CloudinaryStorageProvider implements IStorageProvider {
  readonly type: StorageProviderType = 'cloudinary';
  private readonly clientConfig: ConfigOptions;

  constructor(config: CloudinaryProviderConfig) {
    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      throw new AppException(
        ErrorCode.STORAGE_PROVIDER_NOT_CONFIGURED,
        'Cloudinary credentials are incomplete',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.clientConfig = {
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    };
  }

  /** Apply this provider's credentials to the SDK before each operation. */
  private applyConfig(): void {
    cloudinary.config(this.clientConfig);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    this.applyConfig();
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          // Compress + auto-format (e.g. webp) on the stored derivative.
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            return reject(
              new AppException(
                ErrorCode.UPLOAD_FAILED,
                `Cloudinary upload failed: ${error?.message ?? 'unknown'}`,
                HttpStatus.BAD_GATEWAY,
              ),
            );
          }
          resolve(uploaded);
        },
      );
      stream.end(file.buffer);
    });

    return {
      url: result.secure_url,
      storageId: result.public_id,
      provider: this.type,
      folder,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: result.bytes ?? file.size,
      width: result.width,
      height: result.height,
      publicId: result.public_id,
    };
  }

  async deleteFile(identifier: string): Promise<void> {
    this.applyConfig();
    try {
      await cloudinary.uploader.destroy(identifier);
    } catch (err) {
      throw new AppException(
        ErrorCode.UPLOAD_FAILED,
        `Cloudinary delete failed: ${String(err)}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /** Build an optimised/resized delivery URL for an existing public_id. */
  buildTransformedUrl(
    publicId: string,
    opts: { width?: number; height?: number } = {},
  ): string {
    this.applyConfig();
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { width: opts.width, height: opts.height, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
  }

  async testConnection(): Promise<void> {
    try {
      this.applyConfig();
      const res = await cloudinary.api.ping();
      if (res.status !== 'ok') throw new Error(JSON.stringify(res));
    } catch (err) {
      throw new AppException(
        ErrorCode.STORAGE_CONNECTION_FAILED,
        `Cloudinary connection failed: ${String(err)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
