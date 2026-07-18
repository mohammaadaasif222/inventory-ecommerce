import { HttpStatus } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import {
  IStorageProvider,
  PresignedUpload,
  PresignOptions,
  StorageProviderType,
  UploadResult,
} from './storage-provider.interface';
import { AppException, ErrorCode } from '../../common/exceptions/app.exception';

export interface S3ProviderConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  /** Custom endpoint for S3-compatible stores (MinIO, R2, Spaces). */
  endpoint?: string;
}

/** Amazon S3 (and S3-compatible) provider with presigned direct uploads. */
export class S3StorageProvider implements IStorageProvider {
  readonly type: StorageProviderType = 's3';
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: S3ProviderConfig) {
    if (!config.accessKeyId || !config.secretAccessKey || !config.bucket) {
      throw new AppException(
        ErrorCode.STORAGE_PROVIDER_NOT_CONFIGURED,
        'S3 credentials are incomplete',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region || 'us-east-1',
      endpoint: config.endpoint || undefined,
      forcePathStyle: Boolean(config.endpoint),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private buildKey(folder: string, filename: string): string {
    const ext = (filename.split('.').pop() ?? '').toLowerCase();
    const base = ext ? `${randomUUID()}.${ext}` : randomUUID();
    return `${folder.replace(/^\/+|\/+$/g, '')}/${base}`;
  }

  private publicUrl(key: string): string {
    if (this.config.endpoint) {
      return `${this.config.endpoint.replace(/\/+$/, '')}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    const key = this.buildKey(folder, file.originalname);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (err) {
      throw new AppException(
        ErrorCode.UPLOAD_FAILED,
        `S3 upload failed: ${String(err)}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    return {
      url: this.publicUrl(key),
      storageId: key,
      provider: this.type,
      folder,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bucket: this.bucket,
      key,
    };
  }

  async deleteFile(identifier: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: identifier }),
      );
    } catch (err) {
      throw new AppException(
        ErrorCode.UPLOAD_FAILED,
        `S3 delete failed: ${String(err)}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async getPresignedUpload(opts: PresignOptions): Promise<PresignedUpload> {
    const key = this.buildKey(opts.folder, opts.filename);
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: opts.mimetype,
      }),
      { expiresIn: opts.expiresIn },
    );
    return {
      uploadUrl,
      method: 'PUT',
      storageId: key,
      publicUrl: this.publicUrl(key),
      expiresIn: opts.expiresIn,
    };
  }

  async testConnection(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err) {
      throw new AppException(
        ErrorCode.STORAGE_CONNECTION_FAILED,
        `S3 connection failed: ${String(err)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
