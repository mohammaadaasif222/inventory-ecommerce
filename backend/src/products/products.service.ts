import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Repository,
  SelectQueryBuilder,
  TreeRepository,
} from 'typeorm';
import { Product, ProductImage, ProductStatus } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductThemeVisibility } from './entities/product-theme-visibility.entity';
import {
  ViewerConfig,
  ViewerConfigJson,
} from './entities/viewer-config.entity';
import { Category } from '../catalog/entities/category.entity';
import { UploadService } from '../upload/upload.service';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { slugify } from '../common/utils/slug.util';
import { generateSku } from './sku.util';
import { ResponseMeta } from '../common/interfaces/api-response.interface';
import {
  CreateProductDto,
  ListProductsQueryDto,
  ProductImageDto,
  ProductSort,
  UpdateProductDto,
  VariantInputDto,
} from './dto/product.dto';
import { parseCsv } from './csv.util';

/** Every sort ends on `id` so equal-valued rows can't reshuffle across pages. */
function applySort(qb: SelectQueryBuilder<Product>, sort?: ProductSort): void {
  switch (sort) {
    case ProductSort.PRICE_ASC:
      qb.orderBy('p.basePrice', 'ASC');
      break;
    case ProductSort.PRICE_DESC:
      qb.orderBy('p.basePrice', 'DESC');
      break;
    case ProductSort.RATING_DESC:
      qb.orderBy('p.ratingAverage', 'DESC').addOrderBy('p.ratingCount', 'DESC');
      break;
    case ProductSort.NAME_ASC:
      qb.orderBy('p.name', 'ASC');
      break;
    default:
      qb.orderBy('p.createdAt', 'DESC');
  }
  qb.addOrderBy('p.id', 'ASC');
}

@Injectable()
export class ProductsService {
  private readonly categories: TreeRepository<Category>;

  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variants: Repository<ProductVariant>,
    @InjectRepository(ViewerConfig)
    private readonly viewerConfigs: Repository<ViewerConfig>,
    @InjectRepository(ProductThemeVisibility)
    private readonly themeVisibility: Repository<ProductThemeVisibility>,
    private readonly uploads: UploadService,
    dataSource: DataSource,
  ) {
    this.categories = dataSource.getTreeRepository(Category);
  }

  // ── create ──
  async create(dto: CreateProductDto, vendorId?: string): Promise<Product> {
    const product = this.products.create({
      name: dto.name,
      slug: await this.uniqueSlug(dto.name),
      description: dto.description ?? null,
      categoryId: dto.categoryId ?? null,
      brandId: dto.brandId ?? null,
      tags: dto.tags ?? [],
      basePrice: dto.basePrice,
      currency: dto.currency ?? 'INR',
      status: dto.status ?? ProductStatus.DRAFT,
      images: this.normalizeImages(dto.images ?? []),
      vendorId: vendorId ?? null,
      variants: (dto.variants ?? []).map((v) =>
        this.buildVariant(dto.name, v),
      ),
    });
    return this.products.save(product);
  }

  // ── read ──
  async list(
    query: ListProductsQueryDto,
  ): Promise<{ data: Product[]; meta: ResponseMeta }> {
    const qb = this.products.createQueryBuilder('p');
    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    // Theme-scoped storefronts drop products explicitly hidden in that theme.
    if (query.theme)
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM product_theme_visibility v
           WHERE v.product_id = p.id
             AND v.theme_slug = :theme
             AND v.visible = false)`,
        { theme: query.theme },
      );
    if (query.categoryId)
      qb.andWhere('p.categoryId IN (:...cids)', {
        cids: await this.categoryWithDescendants(query.categoryId),
      });
    if (query.brandId) qb.andWhere('p.brandId = :bid', { bid: query.brandId });
    if (query.ids && query.ids.length > 0)
      qb.andWhere('p.id IN (:...ids)', { ids: query.ids });
    if (query.search)
      qb.andWhere('(p.name ILIKE :s OR p.slug ILIKE :s)', {
        s: `%${query.search}%`,
      });
    if (query.minPrice !== undefined)
      qb.andWhere('p.basePrice >= :minPrice', { minPrice: query.minPrice });
    if (query.maxPrice !== undefined)
      qb.andWhere('p.basePrice <= :maxPrice', { maxPrice: query.maxPrice });
    if (query.minRating !== undefined)
      qb.andWhere('p.ratingAverage >= :minRating', {
        minRating: query.minRating,
      });

    applySort(qb, query.sort);
    qb.skip(query.skip).take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Category ids matching a filter: the category itself plus every descendant,
   * so picking a parent ("Electronics") also returns products filed under its
   * children ("Smartphones"), which is where products actually live.
   */
  private async categoryWithDescendants(categoryId: string): Promise<string[]> {
    const root = await this.categories.findOne({ where: { id: categoryId } });
    if (!root) return [categoryId];
    const tree = await this.categories.findDescendants(root);
    const ids = tree.map((c) => c.id);
    return ids.length > 0 ? ids : [categoryId];
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.products.findOne({ where: { id } });
    if (!product) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
        { entity: 'PRODUCT' },
      );
    }
    return product;
  }

  findBySlug(slug: string): Promise<Product | null> {
    return this.products.findOne({ where: { slug, status: ProductStatus.ACTIVE } });
  }

  // ── update ──
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (dto.name && dto.name !== product.name) {
      product.name = dto.name;
      product.slug = await this.uniqueSlug(dto.name, id);
    }
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
    if (dto.brandId !== undefined) product.brandId = dto.brandId;
    if (dto.tags !== undefined) product.tags = dto.tags;
    if (dto.basePrice !== undefined) product.basePrice = dto.basePrice;
    if (dto.currency !== undefined) product.currency = dto.currency;
    if (dto.status !== undefined) product.status = dto.status;
    if (dto.images !== undefined)
      product.images = this.normalizeImages(dto.images);

    await this.products.save(product);

    if (dto.variants !== undefined) {
      await this.syncVariants(product, dto.variants);
    }
    return this.findOne(id);
  }

  // ── soft delete ──
  async softDelete(id: string): Promise<void> {
    await this.findOne(id);
    await this.products.softDelete(id);
  }
  async restore(id: string): Promise<Product> {
    await this.products.restore(id);
    return this.findOne(id);
  }

  // ── image gallery (UploadModule) ──
  async addImages(
    id: string,
    files: Express.Multer.File[],
  ): Promise<Product> {
    const product = await this.findOne(id);
    const uploaded = await this.uploads.uploadMany(files, 'products', {
      allowed: ['image/*'],
      maxSize: 5 * 1024 * 1024,
    });
    const startOrder = product.images.length;
    const newImages: ProductImage[] = uploaded.map((u, i) => ({
      url: u.url,
      storageId: u.storageId,
      provider: u.provider,
      isPrimary: product.images.length === 0 && i === 0,
      sortOrder: startOrder + i,
      width: u.width,
      height: u.height,
    }));
    product.images = [...product.images, ...newImages];
    return this.products.save(product);
  }

  async removeImage(id: string, storageId: string): Promise<Product> {
    const product = await this.findOne(id);
    const target = product.images.find((img) => img.storageId === storageId);
    if (!target) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Image not found on product',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.uploads.delete(storageId).catch(() => undefined);
    product.images = product.images.filter((img) => img.storageId !== storageId);
    return this.products.save(product);
  }

  // ── CSV bulk import ──
  async bulkImport(
    csv: Buffer,
    vendorId?: string,
  ): Promise<{ created: number; errors: { row: number; message: string }[] }> {
    const rows = parseCsv(csv.toString('utf8'));
    let created = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const attributes: Record<string, string> = {};
        for (const key of ['size', 'color', 'material']) {
          if (row[key]) attributes[key] = row[key];
        }
        const dto: CreateProductDto = {
          name: row.name,
          description: row.description,
          basePrice: Number(row.baseprice ?? row.base_price ?? 0),
          currency: row.currency || 'INR',
          status:
            (row.status?.toUpperCase() as ProductStatus) ||
            ProductStatus.DRAFT,
          tags: row.tags ? row.tags.split('|').map((t) => t.trim()) : [],
          variants: [
            {
              sku: row.sku || undefined,
              attributes,
              price: row.variantprice
                ? Number(row.variantprice)
                : undefined,
            },
          ],
        };
        if (!dto.name) throw new Error('Missing "name" column');
        await this.create(dto, vendorId);
        created++;
      } catch (err) {
        errors.push({
          row: i + 2, // +1 header, +1 to 1-index
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
    return { created, errors };
  }

  /**
   * Active product slugs for the sitemap.
   *
   * `id` must stay in the select: `variants` is eager, so TypeORM paginates
   * via a DISTINCT subquery that references the primary key. Omitting it
   * throws "column distinctAlias.Product_id does not exist" — which the
   * sitemap swallows, silently dropping every product from it.
   */
  activeSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
    return this.products.find({
      where: { status: ProductStatus.ACTIVE },
      select: { id: true, slug: true, updatedAt: true },
      order: { updatedAt: 'DESC' },
      take: 5000,
    });
  }

  // ── used by OrdersModule ──
  findVariantsBySku(skus: string[]): Promise<ProductVariant[]> {
    if (skus.length === 0) return Promise.resolve([]);
    return this.variants.find({
      where: { sku: In(skus) },
      relations: { product: true },
    });
  }

  // ── helpers ──
  private buildVariant(
    productName: string,
    v: VariantInputDto,
  ): ProductVariant {
    return this.variants.create({
      sku: v.sku || generateSku(productName, v.attributes),
      attributes: v.attributes,
      price: v.price ?? null,
      compareAtPrice: v.compareAtPrice ?? null,
      barcode: v.barcode ?? null,
      weightGrams: v.weightGrams ?? 0,
    });
  }

  private async syncVariants(
    product: Product,
    inputs: VariantInputDto[],
  ): Promise<void> {
    const existing = await this.variants.find({
      where: { productId: product.id },
    });
    const keepIds = new Set(inputs.filter((i) => i.id).map((i) => i.id));

    // Remove variants no longer present.
    const toRemove = existing.filter((e) => !keepIds.has(e.id));
    if (toRemove.length) await this.variants.remove(toRemove);

    for (const input of inputs) {
      if (input.id) {
        const variant = existing.find((e) => e.id === input.id);
        if (!variant) continue;
        variant.attributes = input.attributes;
        variant.price = input.price ?? null;
        variant.compareAtPrice = input.compareAtPrice ?? null;
        variant.barcode = input.barcode ?? null;
        variant.weightGrams = input.weightGrams ?? 0;
        if (input.sku) variant.sku = input.sku;
        await this.variants.save(variant);
      } else {
        const variant = this.buildVariant(product.name, input);
        variant.productId = product.id;
        await this.variants.save(variant);
      }
    }
  }

  private normalizeImages(images: ProductImageDto[]): ProductImage[] {
    return images.map((img, i) => ({
      url: img.url,
      storageId: img.storageId,
      provider: img.provider,
      isPrimary: img.isPrimary ?? i === 0,
      sortOrder: img.sortOrder ?? i,
      width: img.width,
      height: img.height,
    }));
  }

  private async uniqueSlug(name: string, ignoreId?: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let n = 1;
    // Loop until a free slug is found (cheap; products are not created at high rate).
    while (true) {
      const existing = await this.products.findOne({
        where: { slug: candidate },
        withDeleted: true,
      });
      if (!existing || existing.id === ignoreId) return candidate;
      candidate = `${base}-${++n}`;
    }
  }

  // ── per-theme visibility ──
  /** Theme slugs this product is hidden in (visible everywhere else). */
  async getHiddenThemes(productId: string): Promise<string[]> {
    const rows = await this.themeVisibility.find({
      where: { productId, visible: false },
    });
    return rows.map((r) => r.themeSlug);
  }

  /** Replace the product's hidden-theme list. */
  async setHiddenThemes(
    productId: string,
    hiddenThemes: string[],
  ): Promise<string[]> {
    await this.findOne(productId); // 404s on unknown products
    await this.themeVisibility.delete({ productId });
    if (hiddenThemes.length > 0) {
      await this.themeVisibility.save(
        hiddenThemes.map((themeSlug) =>
          this.themeVisibility.create({ productId, themeSlug, visible: false }),
        ),
      );
    }
    return hiddenThemes;
  }

  /**
   * Theme-switch migration: show or hide a whole category subtree's products
   * in one theme. `visible: true` deletes the overrides (back to the
   * default-visible state); `false` writes hide rows. Products themselves are
   * never touched.
   */
  async bulkSetThemeVisibility(
    themeSlug: string,
    categoryId: string,
    visible: boolean,
  ): Promise<{ affected: number }> {
    const cids = await this.categoryWithDescendants(categoryId);
    const products = await this.products
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where('p.categoryId IN (:...cids)', { cids })
      .getRawMany<{ id: string }>();
    const ids = products.map((r) => r.id);
    if (ids.length === 0) return { affected: 0 };

    await this.themeVisibility.delete({ productId: In(ids), themeSlug });
    if (!visible) {
      await this.themeVisibility.save(
        ids.map((productId) =>
          this.themeVisibility.create({ productId, themeSlug, visible: false }),
        ),
      );
    }
    return { affected: ids.length };
  }

  // ── 3D / 360 viewer config ──
  async getViewerConfig(productId: string): Promise<ViewerConfigJson | null> {
    const row = await this.viewerConfigs.findOne({ where: { productId } });
    return row?.config ?? null;
  }

  /** Upsert the product's viewer widget settings. */
  async saveViewerConfig(
    productId: string,
    config: ViewerConfigJson,
  ): Promise<ViewerConfigJson> {
    await this.findOne(productId); // 404s on unknown products
    const existing = await this.viewerConfigs.findOne({ where: { productId } });
    const row = existing
      ? Object.assign(existing, { config })
      : this.viewerConfigs.create({ productId, config });
    const saved = await this.viewerConfigs.save(row);
    return saved.config;
  }
}
