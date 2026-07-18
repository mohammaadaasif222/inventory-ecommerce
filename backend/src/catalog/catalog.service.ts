import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, TreeRepository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { Tag } from './entities/tag.entity';
import { Attribute } from './entities/attribute.entity';
import { Collection } from './entities/collection.entity';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { slugify } from '../common/utils/slug.util';
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

@Injectable()
export class CatalogService {
  /** Tree repository resolved from the DataSource (needed for findTrees()). */
  private readonly categories: TreeRepository<Category>;

  constructor(
    @InjectDataSource() dataSource: DataSource,
    @InjectRepository(Brand) private readonly brands: Repository<Brand>,
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
    @InjectRepository(Attribute)
    private readonly attributes: Repository<Attribute>,
    @InjectRepository(Collection)
    private readonly collections: Repository<Collection>,
  ) {
    this.categories = dataSource.getTreeRepository(Category);
  }

  // ── Categories (tree) ──
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const parent = dto.parentId
      ? await this.findCategory(dto.parentId)
      : null;
    const category = this.categories.create({
      name: dto.name,
      slug: slugify(dto.name),
      description: dto.description ?? null,
      imageUrl: dto.imageUrl ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      parent,
    });
    return this.categories.save(category);
  }

  categoryTree(): Promise<Category[]> {
    return this.categories.findTrees();
  }

  /** Active category slugs for the sitemap. */
  activeCategorySlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
    return this.categories.find({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
  }

  async findCategory(id: string): Promise<Category> {
    const found = await this.categories.findOne({ where: { id } });
    if (!found) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Category not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return found;
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findCategory(id);
    if (dto.parentId !== undefined) {
      category.parent = dto.parentId
        ? await this.findCategory(dto.parentId)
        : null;
    }
    if (dto.name) {
      category.name = dto.name;
      category.slug = slugify(dto.name);
    }
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.imageUrl !== undefined) category.imageUrl = dto.imageUrl;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    return this.categories.save(category);
  }

  async removeCategory(id: string): Promise<void> {
    await this.categories.remove(await this.findCategory(id));
  }

  // ── Brands ──
  createBrand(dto: CreateBrandDto): Promise<Brand> {
    return this.brands.save(
      this.brands.create({ ...dto, slug: slugify(dto.name) }),
    );
  }
  listBrands(): Promise<Brand[]> {
    return this.brands.find({ order: { name: 'ASC' } });
  }
  async updateBrand(id: string, dto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.brands.findOne({ where: { id } });
    if (!brand)
      throw new AppException(ErrorCode.NOT_FOUND, 'Brand not found', HttpStatus.NOT_FOUND);
    Object.assign(brand, dto);
    if (dto.name) brand.slug = slugify(dto.name);
    return this.brands.save(brand);
  }
  async removeBrand(id: string): Promise<void> {
    await this.brands.delete({ id });
  }

  // ── Tags ──
  createTag(dto: CreateTagDto): Promise<Tag> {
    return this.tags.save(this.tags.create({ ...dto, slug: slugify(dto.name) }));
  }
  listTags(): Promise<Tag[]> {
    return this.tags.find({ order: { name: 'ASC' } });
  }
  async removeTag(id: string): Promise<void> {
    await this.tags.delete({ id });
  }

  // ── Attributes ──
  createAttribute(dto: CreateAttributeDto): Promise<Attribute> {
    return this.attributes.save(
      this.attributes.create({
        name: dto.name,
        code: slugify(dto.name),
        values: dto.values,
      }),
    );
  }
  listAttributes(): Promise<Attribute[]> {
    return this.attributes.find({ order: { name: 'ASC' } });
  }
  async updateAttribute(
    id: string,
    dto: UpdateAttributeDto,
  ): Promise<Attribute> {
    const attr = await this.attributes.findOne({ where: { id } });
    if (!attr)
      throw new AppException(ErrorCode.NOT_FOUND, 'Attribute not found', HttpStatus.NOT_FOUND);
    if (dto.name) {
      attr.name = dto.name;
      attr.code = slugify(dto.name);
    }
    if (dto.values) attr.values = dto.values;
    return this.attributes.save(attr);
  }
  async removeAttribute(id: string): Promise<void> {
    await this.attributes.delete({ id });
  }

  // ── Collections ──
  createCollection(dto: CreateCollectionDto): Promise<Collection> {
    return this.collections.save(
      this.collections.create({
        name: dto.name,
        slug: slugify(dto.name),
        description: dto.description ?? null,
        productIds: dto.productIds ?? [],
        isFeatured: dto.isFeatured ?? false,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }
  listCollections(featuredOnly = false): Promise<Collection[]> {
    return this.collections.find({
      where: featuredOnly ? { isFeatured: true, isActive: true } : {},
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }
  async updateCollection(
    id: string,
    dto: UpdateCollectionDto,
  ): Promise<Collection> {
    const col = await this.collections.findOne({ where: { id } });
    if (!col)
      throw new AppException(ErrorCode.NOT_FOUND, 'Collection not found', HttpStatus.NOT_FOUND);
    Object.assign(col, dto);
    if (dto.name) col.slug = slugify(dto.name);
    return this.collections.save(col);
  }
  async removeCollection(id: string): Promise<void> {
    await this.collections.delete({ id });
  }
}
