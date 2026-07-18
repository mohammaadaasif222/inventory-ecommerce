import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product, ProductStatus } from '../products/entities/product.entity';

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
  ) {}

  /** Best sellers by total units sold. */
  async popular(limit = 8): Promise<Product[]> {
    const rows = await this.orderItems
      .createQueryBuilder('oi')
      .select('oi.productId', 'productId')
      .addSelect('SUM(oi.quantity)', 'qty')
      .where('oi.productId IS NOT NULL')
      .groupBy('oi.productId')
      .orderBy('qty', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string }>();

    const ids = rows.map((r) => r.productId);
    if (ids.length === 0) return this.fallbackNewest(limit);
    return this.loadActive(ids);
  }

  /** "Customers who bought this also bought…", with a same-category fallback. */
  async related(productId: string, limit = 8): Promise<Product[]> {
    const orderRows = await this.orderItems
      .createQueryBuilder('oi')
      .select('DISTINCT oi.orderId', 'orderId')
      .where('oi.productId = :productId', { productId })
      .getRawMany<{ orderId: string }>();
    const orderIds = orderRows.map((r) => r.orderId);

    let recommended: Product[] = [];
    if (orderIds.length > 0) {
      const coRows = await this.orderItems
        .createQueryBuilder('oi')
        .select('oi.productId', 'productId')
        .addSelect('SUM(oi.quantity)', 'qty')
        .where('oi.orderId IN (:...orderIds)', { orderIds })
        .andWhere('oi.productId != :productId', { productId })
        .groupBy('oi.productId')
        .orderBy('qty', 'DESC')
        .limit(limit)
        .getRawMany<{ productId: string }>();
      recommended = await this.loadActive(coRows.map((r) => r.productId));
    }

    if (recommended.length < limit) {
      const fill = await this.sameCategory(
        productId,
        limit - recommended.length,
        recommended.map((p) => p.id),
      );
      recommended = [...recommended, ...fill];
    }
    return recommended;
  }

  /** Personalised: popular products in the customer's purchased categories. */
  async forYou(userId: string, limit = 8): Promise<Product[]> {
    const myOrders = await this.orders.find({
      where: { customerId: userId },
      select: { id: true },
    });
    if (myOrders.length === 0) return this.popular(limit);

    const items = await this.orderItems.find({
      where: { orderId: In(myOrders.map((o) => o.id)) },
      select: { productId: true },
    });
    const purchasedIds = [
      ...new Set(items.map((i) => i.productId).filter(Boolean)),
    ] as string[];
    if (purchasedIds.length === 0) return this.popular(limit);

    const purchased = await this.products.find({
      where: { id: In(purchasedIds) },
      // See sameCategory(): `id` is required alongside the eager variants join.
      select: { id: true, categoryId: true },
    });
    const categoryIds = [
      ...new Set(purchased.map((p) => p.categoryId).filter(Boolean)),
    ] as string[];
    if (categoryIds.length === 0) return this.popular(limit);

    return this.products.find({
      where: {
        categoryId: In(categoryIds),
        status: ProductStatus.ACTIVE,
        id: Not(In(purchasedIds)),
      },
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  // ── helpers ──
  private async loadActive(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const products = await this.products.find({
      where: { id: In(ids), status: ProductStatus.ACTIVE },
    });
    // Preserve the ranking order from `ids`.
    const byId = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  }

  private async sameCategory(
    productId: string,
    limit: number,
    excludeIds: string[],
  ): Promise<Product[]> {
    const product = await this.products.findOne({
      where: { id: productId },
      // `id` must stay selected — `variants` is eager, so TypeORM's DISTINCT
      // subquery references the primary key and 500s without it.
      select: { id: true, categoryId: true },
    });
    if (!product?.categoryId) return [];
    return this.products.find({
      where: {
        categoryId: product.categoryId,
        status: ProductStatus.ACTIVE,
        id: Not(In([productId, ...excludeIds])),
      },
      take: limit,
    });
  }

  private fallbackNewest(limit: number): Promise<Product[]> {
    return this.products.find({
      where: { status: ProductStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
