import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThan, Repository } from 'typeorm';
import { Cart, CartStatus } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ResponseMeta } from '../common/interfaces/api-response.interface';
import { ListAbandonedCartsQueryDto, SyncCartDto } from './dto/cart.dto';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class CartsService {
  private readonly logger = new Logger(CartsService.name);

  constructor(
    @InjectRepository(Cart) private readonly carts: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly items: Repository<CartItem>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Replace the customer's cart with whatever the browser currently holds.
   * Called (debounced) whenever the client cart changes while signed in.
   */
  async sync(userId: string, dto: SyncCartDto): Promise<Cart | null> {
    return this.dataSource.transaction(async (m) => {
      const cartRepo = m.getRepository(Cart);
      const itemRepo = m.getRepository(CartItem);
      const existing = await cartRepo.findOne({ where: { userId } });

      // An emptied cart is not an abandoned cart — drop the row entirely.
      if (dto.items.length === 0) {
        if (existing) await cartRepo.remove(existing);
        return null;
      }

      const subtotal = round2(
        dto.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      );

      const cart =
        existing ??
        cartRepo.create({
          userId,
          items: [],
        });
      cart.currency = dto.currency ?? cart.currency ?? 'INR';
      cart.subtotal = subtotal;
      cart.lastActivityAt = new Date();
      // Activity un-abandons a cart, and clears the send-once guard.
      cart.status = CartStatus.ACTIVE;
      cart.recoveryEmailSentAt = null;
      const saved = await cartRepo.save(cart);

      // Whole-cart replace: simpler and race-free vs. diffing lines.
      await itemRepo.delete({ cartId: saved.id });
      saved.items = await itemRepo.save(
        dto.items.map((line) =>
          itemRepo.create({
            cartId: saved.id,
            productId: line.productId ?? null,
            sku: line.sku,
            nameSnapshot: line.nameSnapshot,
            imageUrl: line.imageUrl ?? null,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
          }),
        ),
      );
      return saved;
    });
  }

  mine(userId: string): Promise<Cart | null> {
    return this.carts.findOne({ where: { userId } });
  }

  /** Called after checkout: the cart converted, so stop tracking it. */
  async markConverted(userId: string): Promise<void> {
    const cart = await this.carts.findOne({ where: { userId } });
    if (!cart) return;
    await this.carts.remove(cart);
  }

  /**
   * Flags carts idle longer than `idleMinutes` and returns the newly-flagged
   * ones for the recovery mailer. Only carts that never got an email are
   * returned, so a customer is nudged once per abandonment.
   */
  async flagAbandoned(idleMinutes: number): Promise<Cart[]> {
    const cutoff = new Date(Date.now() - idleMinutes * 60_000);
    const stale = await this.carts.find({
      where: {
        status: CartStatus.ACTIVE,
        lastActivityAt: LessThan(cutoff),
        recoveryEmailSentAt: IsNull(),
      },
      take: 200,
    });
    if (stale.length === 0) return [];

    await this.carts.update(
      stale.map((c) => c.id),
      { status: CartStatus.ABANDONED },
    );
    return stale;
  }

  async markRecoveryEmailSent(cartId: string): Promise<void> {
    await this.carts.update(cartId, { recoveryEmailSentAt: new Date() });
  }

  // ── admin ──
  async listAbandoned(
    query: ListAbandonedCartsQueryDto,
  ): Promise<{ data: Cart[]; meta: ResponseMeta }> {
    const [data, total] = await this.carts.findAndCount({
      where: { status: CartStatus.ABANDONED },
      order: { lastActivityAt: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });
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

  async stats(): Promise<{
    active: number;
    abandoned: number;
    abandonedValue: number;
  }> {
    const [active, abandoned] = await Promise.all([
      this.carts.count({ where: { status: CartStatus.ACTIVE } }),
      this.carts.count({ where: { status: CartStatus.ABANDONED } }),
    ]);
    const row = await this.carts
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.subtotal), 0)', 'sum')
      .where('c.status = :status', { status: CartStatus.ABANDONED })
      .getRawOne<{ sum: string }>();
    return {
      active,
      abandoned,
      abandonedValue: round2(Number(row?.sum ?? 0)),
    };
  }
}
