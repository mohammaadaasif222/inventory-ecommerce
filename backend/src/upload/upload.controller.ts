import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { StorageService } from './storage.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import {
  DeleteFileDto,
  PresignDto,
  UploadFileDto,
} from './dto/upload.dto';
import {
  TestConnectionDto,
  UpdateStorageConfigDto,
} from './dto/storage-config.dto';
import { Audit } from '../admin/decorators/audit.decorator';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploads: UploadService,
    private readonly storage: StorageService,
  ) {}

  // ── file uploads (any authenticated user) ─────────────────────────────────
  @Post('file')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'products' },
      },
    },
  })
  @ResponseMessage('File uploaded')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    return this.uploads.uploadOne(file, dto.folder ?? 'products');
  }

  @Post('files')
  @ApiConsumes('multipart/form-data')
  @ResponseMessage('Files uploaded')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 10 }]))
  uploadFiles(
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Body() dto: UploadFileDto,
  ) {
    return this.uploads.uploadMany(files.files ?? [], dto.folder ?? 'products');
  }

  @Post('presigned')
  @ResponseMessage('Presigned URL generated')
  presign(@Body() dto: PresignDto) {
    return this.storage.presign({
      folder: dto.folder,
      filename: dto.filename,
      mimetype: dto.mimetype,
      expiresIn: dto.expiresIn ?? 900,
    });
  }

  @Delete('file')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('File deleted')
  async deleteFile(@Body() dto: DeleteFileDto) {
    await this.uploads.delete(dto.storageId);
    return { deleted: true };
  }

  // ── storage provider configuration (admin) ───────────────────────────────
  @Get('storage-config')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('Storage config loaded')
  getStorageConfig() {
    return this.storage.getConfigView();
  }

  @Put('storage-config')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Audit('STORAGE_CONFIG_UPDATED', 'StorageConfig')
  @ResponseMessage('Storage provider updated')
  updateStorageConfig(
    @Body() dto: UpdateStorageConfigDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.storage.updateConfig(dto, adminId);
  }

  @Post('storage-config/test')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('Connection test completed')
  testStorage(@Body() dto: TestConnectionDto) {
    return this.storage.testConnection(dto);
  }
}
