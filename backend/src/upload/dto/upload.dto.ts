import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/** Allowed upload folders (keeps storage organised + prevents arbitrary paths). */
export const UPLOAD_FOLDERS = [
  'products',
  'avatars',
  'cms',
  'documents',
  'chat-attachments',
] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export class UploadFileDto {
  @ApiPropertyOptional({ enum: UPLOAD_FOLDERS, default: 'products' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9/_-]+$/)
  folder?: string;
}

export class PresignDto {
  @ApiProperty({ example: 'products' })
  @IsString()
  @Matches(/^[a-z0-9/_-]+$/)
  folder: string;

  @ApiProperty({ example: 'banner.png' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  mimetype: string;

  @ApiPropertyOptional({ default: 900, description: 'URL lifetime in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresIn?: number;
}

export class DeleteFileDto {
  @ApiProperty({ description: 'storageId returned at upload time' })
  @IsString()
  storageId: string;
}
