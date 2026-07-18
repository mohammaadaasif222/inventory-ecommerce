import { INestApplicationContext, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CatalogService } from '../catalog/catalog.service';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { ReviewsService } from '../reviews/reviews.service';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { Review } from '../reviews/entities/review.entity';
import { Category } from '../catalog/entities/category.entity';
import { Brand } from '../catalog/entities/brand.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';
import { StockMovementType } from '../inventory/enums/stock-movement-type.enum';
import { slugify } from '../common/utils/slug.util';
import {
  REVIEW_COPY,
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_REVIEWER_PASSWORD,
  SEED_REVIEWERS,
} from './catalog.data';
import {
  PERFUME_BRANDS,
  PERFUME_CATEGORIES,
  PERFUME_PRODUCTS,
} from './perfume.data';

// The perfume range is seeded alongside the general catalog, not instead of it.
const ALL_CATEGORIES = [...SEED_CATEGORIES, ...PERFUME_CATEGORIES];
const ALL_BRANDS = [...SEED_BRANDS, ...PERFUME_BRANDS];
const ALL_PRODUCTS = [...SEED_PRODUCTS, ...PERFUME_PRODUCTS];

/**
 * Seeds a demo catalog: categories, brands, products with variants, received
 * stock, and reviews whose aggregate drives the storefront's rating filter.
 *
 * Idempotent per row — everything is matched on slug (or email) and created
 * only when missing, so re-running tops up without duplicating and without
 * touching products that were added by hand.
 */
export async function seedCatalog(
  app: INestApplicationContext,
  logger: Logger,
): Promise<void> {
  const dataSource = app.get(DataSource);
  const catalog = app.get(CatalogService);
  const products = app.get(ProductsService);
  const inventory = app.get(InventoryService);
  const reviews = app.get(ReviewsService);
  const users = app.get(UsersService);
  const auth = app.get(AuthService);

  const productRepo = dataSource.getRepository(Product);
  const categoryRepo = dataSource.getRepository(Category);
  const brandRepo = dataSource.getRepository(Brand);
  const reviewRepo = dataSource.getRepository(Review);
  const warehouseRepo = dataSource.getRepository(Warehouse);

  // ── warehouse ──
  const warehouse =
    (await warehouseRepo.findOne({ where: { isDefault: true } })) ??
    (await inventory.createWarehouse({
      name: 'Main Warehouse',
      code: 'MAIN',
      address: 'Bengaluru, KA',
      isDefault: true,
    }));

  // ── categories (two levels) ──
  const categoryIdBySlug = new Map<string, string>();
  const ensureCategory = async (
    name: string,
    parentId?: string,
  ): Promise<{ id: string; slug: string }> => {
    const slug = slugify(name);
    const existing = await categoryRepo.findOne({ where: { slug } });
    if (existing) return existing;
    return catalog.createCategory({ name, parentId });
  };

  for (const node of ALL_CATEGORIES) {
    const parent = await ensureCategory(node.name);
    categoryIdBySlug.set(parent.slug, parent.id);
    for (const childName of node.children ?? []) {
      const child = await ensureCategory(childName, parent.id);
      categoryIdBySlug.set(child.slug, child.id);
    }
  }

  // ── brands ──
  const brandIdBySlug = new Map<string, string>();
  for (const name of ALL_BRANDS) {
    const slug = slugify(name);
    const brand =
      (await brandRepo.findOne({ where: { slug } })) ??
      (await catalog.createBrand({ name }));
    brandIdBySlug.set(brand.slug, brand.id);
  }

  // ── reviewers ──
  const reviewerIds: string[] = [];
  for (const person of SEED_REVIEWERS) {
    const existing = await users.findByEmail(person.email);
    if (existing) {
      reviewerIds.push(existing.id);
      continue;
    }
    await auth.register({
      email: person.email,
      password: SEED_REVIEWER_PASSWORD,
      firstName: person.firstName,
      lastName: person.lastName,
    });
    const created = await users.findByEmail(person.email);
    if (created) reviewerIds.push(created.id);
  }

  // ── products ──
  let created = 0;
  let skipped = 0;
  let variantCount = 0;
  let reviewCount = 0;

  for (const seed of ALL_PRODUCTS) {
    const categoryId = categoryIdBySlug.get(seed.category);
    if (!categoryId) {
      logger.warn(`Unknown category "${seed.category}" for ${seed.name} — skipped`);
      continue;
    }

    const slug = slugify(seed.name);
    if (await productRepo.exists({ where: { slug } })) {
      skipped += 1;
      continue;
    }

    const product = await products.create({
      name: seed.name,
      description: seed.description,
      categoryId,
      brandId: brandIdBySlug.get(slugify(seed.brand)),
      tags: seed.tags,
      basePrice: seed.basePrice,
      currency: 'INR',
      status: ProductStatus.ACTIVE,
      images: [
        {
          url: `https://picsum.photos/seed/${slug}/800/800`,
          storageId: `seed/${slug}`,
          provider: 'external',
          isPrimary: true,
          sortOrder: 0,
          width: 800,
          height: 800,
        },
      ],
      variants: seed.variants.map((attributes) => ({ attributes })),
    });
    created += 1;
    variantCount += product.variants.length;

    // ── stock: receive the same quantity into every variant SKU ──
    if (seed.stock > 0) {
      for (const variant of product.variants) {
        await inventory.adjustStock({
          sku: variant.sku,
          warehouseId: warehouse.id,
          type: StockMovementType.INBOUND,
          quantity: seed.stock,
          reason: 'Initial seed stock',
        });
      }
    }

    // ── reviews: one per reviewer, in order, so the unique index holds ──
    const ratings = seed.reviews.slice(0, reviewerIds.length);
    if (ratings.length > 0) {
      await reviewRepo.save(
        ratings.map((rating, i) => {
          const pool = REVIEW_COPY[rating];
          const copy = pool[i % pool.length];
          return reviewRepo.create({
            productId: product.id,
            userId: reviewerIds[i],
            rating,
            title: copy.title,
            body: copy.body,
            // Alternate rather than randomise so reseeds look identical.
            isVerifiedPurchase: i % 3 !== 2,
          });
        }),
      );
      await reviews.recomputeAggregate(product.id);
      reviewCount += ratings.length;
    }
  }

  logger.log('──────────────────────────────────────────────');
  if (created === 0) {
    logger.log(`✅ Demo catalog already present (${skipped} products) — nothing to do`);
  } else {
    logger.log('✅ Demo catalog seeded');
    logger.log(`   products:   ${created} new (${variantCount} variants)${skipped ? `, ${skipped} already present` : ''}`);
    logger.log(`   categories: ${categoryIdBySlug.size}`);
    logger.log(`   brands:     ${brandIdBySlug.size}`);
    logger.log(`   reviews:    ${reviewCount} from ${reviewerIds.length} customers`);
    logger.log(`   customers:  password "${SEED_REVIEWER_PASSWORD}"`);
  }
  logger.log('──────────────────────────────────────────────');
}
