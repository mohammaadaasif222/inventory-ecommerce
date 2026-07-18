import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Between, In, Repository } from 'typeorm';
import { Model } from 'mongoose';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { StockItem } from '../inventory/entities/stock-item.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { StockMovementType } from '../inventory/enums/stock-movement-type.enum';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket.enum';
import { Chat, ChatDocument } from '../chat/schemas/chat.schema';
import { Message, MessageDocument } from '../chat/schemas/message.schema';
import { ChatStatus } from '../chat/enums/chat.enum';
import { Granularity } from './dto/analytics.dto';

const REVENUE_STATUSES: OrderStatus[] = Object.values(OrderStatus).filter(
  (s) => s !== OrderStatus.CANCELLED && s !== OrderStatus.REFUNDED,
);

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(StockItem)
    private readonly stock: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movements: Repository<StockMovement>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectModel(Chat.name) private readonly chats: Model<ChatDocument>,
    @InjectModel(Message.name)
    private readonly messages: Model<MessageDocument>,
  ) {}

  // ── sales ──
  async salesSummary(from: Date, to: Date) {
    const orders = await this.orders.find({
      where: { placedAt: Between(from, to) },
      select: { id: true, grandTotal: true, status: true },
    });
    const revenueOrders = orders.filter((o) =>
      REVENUE_STATUSES.includes(o.status),
    );
    const revenue = revenueOrders.reduce((s, o) => s + Number(o.grandTotal), 0);
    const orderIds = revenueOrders.map((o) => o.id);
    const items = orderIds.length
      ? await this.orderItems.find({
          where: { orderId: In(orderIds) },
          select: { quantity: true },
        })
      : [];
    const itemsSold = items.reduce((s, i) => s + i.quantity, 0);
    return {
      revenue: round(revenue),
      orders: revenueOrders.length,
      avgOrderValue: revenueOrders.length
        ? round(revenue / revenueOrders.length)
        : 0,
      itemsSold,
      from,
      to,
    };
  }

  async revenueSeries(from: Date, to: Date, granularity: Granularity) {
    const orders = await this.orders.find({
      where: { placedAt: Between(from, to) },
      select: { grandTotal: true, status: true, placedAt: true },
    });
    const buckets = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      if (!REVENUE_STATUSES.includes(o.status)) continue;
      const key = bucketKey(o.placedAt, granularity);
      const cur = buckets.get(key) ?? { revenue: 0, orders: 0 };
      cur.revenue += Number(o.grandTotal);
      cur.orders += 1;
      buckets.set(key, cur);
    }
    return [...buckets.entries()]
      .map(([bucket, v]) => ({ bucket, revenue: round(v.revenue), orders: v.orders }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));
  }

  async ordersByStatus() {
    const rows = await this.orders.find({ select: { status: true } });
    return countBy(rows, (o) => o.status);
  }

  // ── inventory health ──
  async inventoryHealth() {
    const [totalSkus, lowStock, outOfStock] = await Promise.all([
      this.stock.count(),
      this.stock
        .createQueryBuilder('s')
        .where('s.quantity <= s.lowStockThreshold')
        .getCount(),
      this.stock.count({ where: { quantity: 0 } }),
    ]);

    const totals = await this.stock
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.quantity),0)', 'units')
      .addSelect('COALESCE(SUM(s.reserved),0)', 'reserved')
      .getRawOne<{ units: string; reserved: string }>();

    // Dead stock: on-hand but no outbound movement in the last 90 days.
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentOut = await this.movements
      .createQueryBuilder('m')
      .select('DISTINCT m.sku', 'sku')
      .where('m.type = :t', { t: StockMovementType.OUTBOUND })
      .andWhere('m.createdAt >= :since', { since })
      .getRawMany<{ sku: string }>();
    const movedSkus = new Set(recentOut.map((r) => r.sku));
    const inStock = await this.stock.find({
      where: {},
      select: { sku: true, quantity: true },
    });
    const deadStock = inStock.filter(
      (s) => s.quantity > 0 && !movedSkus.has(s.sku),
    ).length;

    const unitsOut = await this.movements
      .createQueryBuilder('m')
      .select('COALESCE(SUM(ABS(m.delta)),0)', 'out')
      .where('m.type = :t', { t: StockMovementType.OUTBOUND })
      .andWhere('m.createdAt >= :since', { since })
      .getRawOne<{ out: string }>();
    const onHand = Number(totals?.units ?? 0);
    const turnoverRate = onHand > 0 ? round(Number(unitsOut?.out ?? 0) / onHand) : 0;

    return {
      totalSkus,
      lowStock,
      outOfStock,
      deadStock,
      totalUnits: Number(totals?.units ?? 0),
      totalReserved: Number(totals?.reserved ?? 0),
      turnoverRate,
    };
  }

  // ── support (tickets) ──
  async supportMetrics(from: Date, to: Date) {
    const tickets = await this.tickets.find({
      where: { createdAt: Between(from, to) },
      select: {
        status: true,
        priority: true,
        slaBreached: true,
        createdAt: true,
        resolvedAt: true,
      },
    });
    const resolved = tickets.filter((t) => t.resolvedAt);
    const avgResolutionMinutes = resolved.length
      ? round(
          resolved.reduce(
            (s, t) =>
              s + (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 60000,
            0,
          ) / resolved.length,
        )
      : 0;
    return {
      total: tickets.length,
      byStatus: countBy(tickets, (t) => t.status),
      byPriority: countBy(tickets, (t) => t.priority),
      open: tickets.filter(
        (t) =>
          t.status !== TicketStatus.RESOLVED &&
          t.status !== TicketStatus.CLOSED,
      ).length,
      breached: tickets.filter((t) => t.slaBreached).length,
      avgResolutionMinutes,
      // CSAT requires a post-resolution rating channel (not yet collected).
      csat: null as number | null,
    };
  }

  // ── chat ──
  async chatMetrics(from: Date, to: Date) {
    const match = { createdAt: { $gte: from, $lte: to } };
    const [total, assigned, closed, messageCount] = await Promise.all([
      this.chats.countDocuments(match),
      this.chats.countDocuments({ ...match, agentId: { $ne: null } }),
      this.chats.countDocuments({ ...match, status: ChatStatus.CLOSED }),
      this.messages.countDocuments({ createdAt: { $gte: from, $lte: to } }),
    ]);
    return {
      total,
      closed,
      active: total - closed,
      assignmentRate: total ? round(assigned / total) : 0,
      avgMessagesPerChat: total ? round(messageCount / total) : 0,
    };
  }

  // ── combined dashboard ──
  async dashboard(from: Date, to: Date) {
    const [sales, inventory, support, chat, orderStatus] = await Promise.all([
      this.salesSummary(from, to),
      this.inventoryHealth(),
      this.supportMetrics(from, to),
      this.chatMetrics(from, to),
      this.ordersByStatus(),
    ]);
    return { sales, inventory, support, chat, orderStatus };
  }

  // ── reports ──
  async salesReportRows(from: Date, to: Date) {
    return this.orders.find({
      where: { placedAt: Between(from, to) },
      order: { placedAt: 'DESC' },
      select: {
        orderNumber: true,
        status: true,
        paymentStatus: true,
        grandTotal: true,
        currency: true,
        placedAt: true,
      },
    });
  }
}

// ── helpers ──
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const k = key(row);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function bucketKey(date: Date, granularity: Granularity): string {
  const d = new Date(date);
  if (granularity === 'month') {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  if (granularity === 'week') {
    const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(
      ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7,
    );
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  return d.toISOString().slice(0, 10); // day
}
