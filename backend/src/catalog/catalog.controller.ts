import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import {
  CreateAttributeDto,
  CreateBrandDto,
  CreateCategoryDto,
  CreateCollectionDto,
  CreateTagDto,
  UpdateAttributeDto,
  UpdateBrandDto,
  UpdateCategoryDto,
  UpdateCollectionDto,
} from './dto/catalog.dto';

const ADMIN = [Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // ── Categories ──
  @Public()
  @Get('categories')
  @ResponseMessage('Category tree loaded')
  categoryTree() {
    return this.catalog.categoryTree();
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post('categories')
  @ResponseMessage('Category created')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalog.createCategory(dto);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch('categories/:id')
  @ResponseMessage('Category updated')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalog.updateCategory(id, dto);
  }

  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Delete('categories/:id')
  @ResponseMessage('Category removed')
  async removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    await this.catalog.removeCategory(id);
    return { removed: true };
  }

  // ── Brands ──
  @Public()
  @Get('brands')
  listBrands() {
    return this.catalog.listBrands();
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post('brands')
  @ResponseMessage('Brand created')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.catalog.createBrand(dto);
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch('brands/:id')
  updateBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.catalog.updateBrand(id, dto);
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Delete('brands/:id')
  async removeBrand(@Param('id', ParseUUIDPipe) id: string) {
    await this.catalog.removeBrand(id);
    return { removed: true };
  }

  // ── Tags ──
  @Public()
  @Get('tags')
  listTags() {
    return this.catalog.listTags();
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post('tags')
  createTag(@Body() dto: CreateTagDto) {
    return this.catalog.createTag(dto);
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Delete('tags/:id')
  async removeTag(@Param('id', ParseUUIDPipe) id: string) {
    await this.catalog.removeTag(id);
    return { removed: true };
  }

  // ── Attributes ──
  @Public()
  @Get('attributes')
  listAttributes() {
    return this.catalog.listAttributes();
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post('attributes')
  createAttribute(@Body() dto: CreateAttributeDto) {
    return this.catalog.createAttribute(dto);
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch('attributes/:id')
  updateAttribute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.catalog.updateAttribute(id, dto);
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Delete('attributes/:id')
  async removeAttribute(@Param('id', ParseUUIDPipe) id: string) {
    await this.catalog.removeAttribute(id);
    return { removed: true };
  }

  // ── Collections ──
  @Public()
  @Get('collections')
  listCollections(@Query('featured') featured?: string) {
    return this.catalog.listCollections(featured === 'true');
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Post('collections')
  createCollection(@Body() dto: CreateCollectionDto) {
    return this.catalog.createCollection(dto);
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Patch('collections/:id')
  updateCollection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.catalog.updateCollection(id, dto);
  }
  @ApiBearerAuth()
  @Roles(...ADMIN)
  @Delete('collections/:id')
  async removeCollection(@Param('id', ParseUUIDPipe) id: string) {
    await this.catalog.removeCollection(id);
    return { removed: true };
  }
}
