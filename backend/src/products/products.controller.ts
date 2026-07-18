import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { Audit } from '../admin/decorators/audit.decorator';
import {
  CreateProductDto,
  ListProductsQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
import { SaveViewerConfigDto } from './dto/viewer-config.dto';

const MANAGE = [Role.ADMIN, Role.SUPER_ADMIN, Role.VENDOR];

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get()
  @ResponseMessage('Products listed')
  list(@Query() query: ListProductsQueryDto) {
    return this.products.list(query);
  }

  @Public()
  @Get('slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  byId(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  // ── 3D / 360 viewer widget ──
  /** The storefront reads this to decide how to present the product media. */
  @Public()
  @Get(':id/viewer')
  @ResponseMessage('Viewer config loaded')
  viewerConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.getViewerConfig(id);
  }

  @ApiBearerAuth()
  @Roles(...MANAGE)
  @Put(':id/viewer')
  @Audit('PRODUCT_VIEWER_UPDATED', 'Product')
  @ResponseMessage('Viewer config saved')
  saveViewerConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveViewerConfigDto,
  ) {
    return this.products.saveViewerConfig(id, dto);
  }

  @ApiBearerAuth()
  @Roles(...MANAGE)
  @Post()
  @Audit('PRODUCT_CREATED', 'Product')
  @ResponseMessage('Product created')
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.products.create(dto, userId);
  }

  @ApiBearerAuth()
  @Roles(...MANAGE)
  @Patch(':id')
  @Audit('PRODUCT_UPDATED', 'Product')
  @ResponseMessage('Product updated')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(...MANAGE)
  @Delete(':id')
  @Audit('PRODUCT_DELETED', 'Product')
  @ResponseMessage('Product archived')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.products.softDelete(id);
    return { deleted: true };
  }

  @ApiBearerAuth()
  @Roles(...MANAGE)
  @Post(':id/restore')
  @ResponseMessage('Product restored')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.restore(id);
  }

  // ── image gallery ──
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @Roles(...MANAGE)
  @Post(':id/images')
  @ResponseMessage('Images uploaded')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 10 }]))
  addImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
  ) {
    return this.products.addImages(id, files.files ?? []);
  }

  @ApiBearerAuth()
  @Roles(...MANAGE)
  @Delete(':id/images/:storageId')
  @ResponseMessage('Image removed')
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('storageId') storageId: string,
  ) {
    return this.products.removeImage(id, decodeURIComponent(storageId));
  }

  // ── CSV bulk import ──
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('import/csv')
  @Audit('PRODUCTS_BULK_IMPORTED', 'Product')
  @ResponseMessage('Import completed')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.products.bulkImport(file.buffer, userId);
  }
}
