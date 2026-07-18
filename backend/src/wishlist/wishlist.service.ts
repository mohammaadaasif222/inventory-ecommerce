import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WishlistItem } from './entities/wishlist-item.entity';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistItem)
    private readonly items: Repository<WishlistItem>,
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
  ) {}

  /** Full product rows for the wishlist page, newest addition first. */
  async list(userId: string): Promise<Product[]> {
    const rows = await this.items.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (rows.length === 0) return [];

    const products = await this.products.find({
      where: { id: In(rows.map((r) => r.productId)) },
    });
    // Preserve wishlist order; drop products deleted since they were saved.
    const byId = new Map(products.map((p) => [p.id, p]));
    return rows
      .map((r) => byId.get(r.productId))
      .filter((p): p is Product => p !== undefined);
  }

  /** Just the ids — lets the storefront fill hearts without loading products. */
  async listProductIds(userId: string): Promise<string[]> {
    const rows = await this.items.find({
      where: { userId },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }

  async add(userId: string, productId: string): Promise<{ added: boolean }> {
    await this.assertProductExists(productId);
    const existing = await this.items.findOne({
      where: { userId, productId },
    });
    if (existing) return { added: false };
    await this.items.save(this.items.create({ userId, productId }));
    return { added: true };
  }

  async remove(userId: string, productId: string): Promise<{ removed: boolean }> {
    const result = await this.items.delete({ userId, productId });
    return { removed: (result.affected ?? 0) > 0 };
  }

  /** Single round-trip for the heart button. */
  async toggle(
    userId: string,
    productId: string,
  ): Promise<{ inWishlist: boolean }> {
    const existing = await this.items.findOne({ where: { userId, productId } });
    if (existing) {
      await this.items.remove(existing);
      return { inWishlist: false };
    }
    await this.assertProductExists(productId);
    await this.items.save(this.items.create({ userId, productId }));
    return { inWishlist: true };
  }

  count(userId: string): Promise<number> {
    return this.items.count({ where: { userId } });
  }

  private async assertProductExists(productId: string): Promise<void> {
    const exists = await this.products.exists({
      where: { id: productId, status: ProductStatus.ACTIVE },
    });
    if (!exists) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        `Product ${productId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
