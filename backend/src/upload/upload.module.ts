import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StorageConfig } from './entities/storage-config.entity';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { StorageService } from './storage.service';
import { StorageConfigService } from './storage-config.service';

/**
 * Unified upload module. Exposes UploadService/StorageService to other modules
 * (avatars, product galleries, chat attachments) and the admin storage-config
 * endpoints. The active provider (Cloudinary / S3 / Local) is DB-driven and
 * switchable at runtime.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([StorageConfig]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 }, // hard cap; per-route limits tighter
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService, StorageService, StorageConfigService],
  exports: [UploadService, StorageService],
})
export class UploadModule {}
