import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import {
  ORDER_TRANSITIONS,
  OrderStatus,
  PaymentStatus,
  RELEASE_ON,
} from './enums/order-status.enum';
import { ProductsService } from '../products/products.service';
import {
  InventoryService,
  OrderLine,
  Reservation,
} from '../inventory/inventory.service';
import { CouponsService } from '../coupons/coupons.service';
import { OrderMailer } from './order-mailer';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { ResponseMeta } from '../common/interfaces/api-response.interface';
import {
  CreateOrderDto,
  FulfillOrderDto,
  ListOrdersQueryDto,
} from './dto/order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly items: Repository<OrderItem>,
    private readonly products: ProductsService,
    private readonly inventory: InventoryService,
    private readonly coupons: CouponsService,
    private readonly mailer: OrderMailer,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create an order atomically: snapshot prices, reserve inventory and persist
   * the order + line items in a single transaction. Any shortfall rolls
   * everything back (no partial reservation).
   *
   * `customerId` is null for guest checkout — the order then binds to
   * `dto.guestEmail` and receives a `guestToken`, the bearer secret behind the
   * guest's order page and payment initiation.
   */
  async create(dto: CreateOrderDto, customerId: string | null): Promise<Order> {
    if (dto.items.length === 0) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'Order must contain at least one item',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!customerId && !dto.guestEmail) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'Guest checkout requires an email address for the order confirmation',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Resolve current variants/prices up-front (outside the lock window).
    const skus = dto.items.map((i) => i.sku);
    const variants = await this.products.findVariantsBySku(skus);
    const bySku = new Map(variants.map((v) => [v.sku, v]));

    for (const line of dto.items) {
      if (!bySku.has(line.sku)) {
        throw new AppException(
          ErrorCode.NOT_FOUND,
          `Unknown SKU: ${line.sku}`,
          HttpStatus.NOT_FOUND,
        );
      }
    }

    return this.dataSource.transaction(async (m) => {
      const orderRepo = m.getRepository(Order);
      const itemRepo = m.getRepository(OrderItem);

      // Reserve stock (pessimistic lock) for all lines.
      const lines: OrderLine[] = dto.items.map((i) => ({
        sku: i.sku,
        quantity: i.quantity,
      }));
      const orderId = randomUUID();
      const reservations = await this.inventory.reserveForOrder(
        m,
        lines,
        orderId,
      );
      const resBySku = new Map(reservations.map((r) => [r.sku, r]));

      // Build line items with price/name snapshots.
      let subtotal = 0;
      const orderItems: OrderItem[] = dto.items.map((line) => {
        const variant = bySku.get(line.sku)!;
        const product = variant.product;
        const unitPrice = variant.price ?? product.basePrice;
        const lineTotal = unitPrice * line.quantity;
        subtotal += lineTotal;
        return itemRepo.create({
          productId: product.id,
          variantId: variant.id,
          sku: variant.sku,
          nameSnapshot: product.name,
          attributesSnapshot: variant.attributes,
          unitPrice,
          quantity: line.quantity,
          fulfilledQuantity: 0,
          warehouseId: resBySku.get(line.sku)?.warehouseId ?? null,
          lineTotal,
        });
      });

      const shipping = dto.shippingTotal ?? 0;
      const tax = dto.taxTotal ?? 0;

      // Discount is derived from the coupon inside this transaction — the
      // client sends a code, never an amount. Re-quoting here (rather than
      // trusting the earlier /validate call) means limits and expiry are
      // checked against the subtotal we just computed from live prices.
      const quote = dto.couponCode
        ? await this.coupons.quote(
            dto.couponCode,
            subtotal,
            shipping,
            customerId,
            m,
          )
        : null;
      const discount = quote?.discount ?? 0;
      const grandTotal = Math.max(0, subtotal + shipping + tax - discount);

      const order = orderRepo.create({
        id: orderId,
        orderNumber: this.generateOrderNumber(),
        customerId,
        guestEmail: customerId ? null : dto.guestEmail!.toLowerCase(),
        // base64url: URL-safe without encoding, since it travels in the
        // confirmation link. 24 random bytes ≈ 192 bits — unguessable.
        guestToken: customerId ? null : randomBytes(24).toString('base64url'),
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        currency: bySku.get(dto.items[0].sku)!.product.currency,
        subtotal,
        shippingTotal: shipping,
        taxTotal: tax,
        discountTotal: discount,
        grandTotal,
        shippingAddress: dto.shippingAddress,
        billingAddress: dto.billingAddress ?? dto.shippingAddress,
        notes: dto.notes ?? null,
        items: orderItems,
      });
      const saved = await orderRepo.save(order);

      // Burn the use only once the order is persisted — same transaction, so
      // a rollback anywhere above leaves the coupon untouched.
      if (quote) {
        await this.coupons.redeem(
          m,
          quote.coupon.id,
          customerId,
          orderId,
          discount,
        );
      }
      return saved;
    }).then((saved) => {
      // Fire-and-forget outside the transaction: a mail outage must never
      // roll back a paid-for reservation, and the queue records the attempt.
      void this.mailer.sendConfirmation(saved).catch((err: Error) => {
        this.logger.warn(
          `Order ${saved.orderNumber}: confirmation email not queued — ${err.message}`,
        );
      });
      return saved;
    });
  }

  /**
   * A guest's own order, authorised by the token from the creation response.
   *
   * Constant behaviour on every failure path (missing order, account-bound
   * order, wrong token): the same 404. Distinguishing them would let a caller
   * probe which order ids exist.
   */
  async findGuestOrder(id: string, token: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id } });
    if (!order?.guestToken || !token || order.guestToken !== token) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Order not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return order;
  }

  // ── reads ──
  async list(
    query: ListOrdersQueryDto,
    customerId?: string,
  ): Promise<{ data: Order[]; meta: ResponseMeta }> {
    const qb = this.orders.createQueryBuilder('o');
    if (customerId) qb.where('o.customerId = :cid', { cid: customerId });
    if (query.status) qb.andWhere('o.status = :st', { st: query.status });
    if (query.search)
      qb.andWhere('o.orderNumber ILIKE :s', { s: `%${query.search}%` });
    qb.orderBy('o.placedAt', 'DESC').skip(query.skip).take(query.limit);

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

  async findOne(id: string, customerId?: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id } });
    if (!order || (customerId && order.customerId !== customerId)) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Order not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return order;
  }

  // ── status machine ──
  async updateStatus(id: string, next: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);
    const allowed = ORDER_TRANSITIONS[order.status];
    if (!allowed.includes(next)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        `Cannot transition order from ${order.status} to ${next}`,
        HttpStatus.CONFLICT,
        { from: order.status, allowed },
      );
    }

    // Release still-reserved (unfulfilled) stock on cancel/return.
    if (RELEASE_ON.includes(next)) {
      const reservations = this.outstandingReservations(order);
      if (reservations.length) {
        await this.inventory.releaseReservations(reservations, order.id);
      }
    }

    order.status = next;
    return this.orders.save(order);
  }

  // ── partial fulfillment ──
  async fulfill(id: string, dto: FulfillOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    if (
      ![OrderStatus.CONFIRMED, OrderStatus.PROCESSING].includes(order.status)
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        `Order must be CONFIRMED or PROCESSING to fulfill (is ${order.status})`,
        HttpStatus.CONFLICT,
      );
    }

    const commits: Reservation[] = [];
    for (const line of dto.lines) {
      const item = order.items.find((i) => i.sku === line.sku);
      if (!item) {
        throw new AppException(
          ErrorCode.NOT_FOUND,
          `SKU ${line.sku} is not on this order`,
          HttpStatus.NOT_FOUND,
        );
      }
      const remaining = item.quantity - item.fulfilledQuantity;
      if (line.quantity > remaining) {
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          `Cannot fulfill ${line.quantity} of ${line.sku}; only ${remaining} remaining`,
          HttpStatus.CONFLICT,
        );
      }
      item.fulfilledQuantity += line.quantity;
      if (item.warehouseId) {
        commits.push({
          sku: item.sku,
          warehouseId: item.warehouseId,
          quantity: line.quantity,
        });
      }
    }

    await this.inventory.fulfillReservations(commits, order.id);
    await this.items.save(order.items);

    // Auto-advance: PROCESSING once anything ships; SHIPPED when fully done.
    const fullyFulfilled = order.items.every(
      (i) => i.fulfilledQuantity >= i.quantity,
    );
    if (order.status === OrderStatus.CONFIRMED) {
      order.status = OrderStatus.PROCESSING;
    }
    if (fullyFulfilled && order.status === OrderStatus.PROCESSING) {
      order.status = OrderStatus.SHIPPED;
    }
    return this.orders.save(order);
  }

  /** Mutate payment status (called by PaymentsModule). */
  async setPaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    await this.orders.update({ id }, { paymentStatus });
  }

  // ── helpers ──
  private outstandingReservations(order: Order): Reservation[] {
    return order.items
      .filter((i) => i.warehouseId && i.quantity > i.fulfilledQuantity)
      .map((i) => ({
        sku: i.sku,
        warehouseId: i.warehouseId as string,
        quantity: i.quantity - i.fulfilledQuantity,
      }));
  }

  private generateOrderNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD-${ts}-${rand}`;
  }
}
