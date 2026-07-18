import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { StorageProviderType } from '../providers/storage-provider.interface';

const PROVIDERS: StorageProviderType[] = ['cloudinary', 's3', 'local'];

/**
 * Admin payload to update + activate a storage provider.
 * Secret fields are optional on update: when omitted/empty the previously
 * stored (encrypted) secret is kept, so the UI never has to re-enter secrets.
 */
export class UpdateStorageConfigDto {
  @ApiProperty({ enum: PROVIDERS })
  @IsIn(PROVIDERS)
  provider: StorageProviderType;

  // ── Cloudinary ──
  @ApiPropertyOptional()
  @ValidateIf((o) => o.provider === 'cloudinary')
  @IsOptional()
  @IsString()
  cloudinaryCloudName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cloudinaryApiKey?: string;

  @ApiPropertyOptional({ description: 'Write-only. Omit to keep existing.' })
  @IsOptional()
  @IsString()
  cloudinaryApiSecret?: string;

  // ── S3 ──
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  s3AccessKey?: string;

  @ApiPropertyOptional({ description: 'Write-only. Omit to keep existing.' })
  @IsOptional()
  @IsString()
  s3SecretKey?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.provider === 's3')
  @IsOptional()
  @IsString()
  s3Bucket?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.provider === 's3')
  @IsOptional()
  @IsString()
  s3Region?: string;

  @ApiPropertyOptional({ description: 'Custom S3-compatible endpoint (MinIO).' })
  @IsOptional()
  @IsString()
  s3Endpoint?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Optionally test a provider with ad-hoc creds instead of the saved ones. */
export class TestConnectionDto extends UpdateStorageConfigDto {}

/** Safe, secret-masked view returned to the admin UI. */
export interface StorageConfigView {
  id: string;
  provider: StorageProviderType;
  isActive: boolean;
  cloudinaryCloudName: string | null;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3Bucket: string | null;
  s3Region: string | null;
  s3Endpoint: string | null;
  updatedBy: string | null;
  updatedAt: Date;
}
