import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { StockItem } from './entities/stock-item.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementType } from './enums/stock-movement-type.enum';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { ResponseMeta } from '../common/interfaces/api-response.interface';
import {
  AdjustStockDto,
  CreateWarehouseDto,
  ListMovementsQueryDto,
  ListStockQueryDto,
  SetThresholdDto,
  TransferStockDto,
} from './dto/inventory.dto';

export interface OrderLine {
  sku: string;
  quantity: number;
}
export interface Reservation {
  sku: string;
  warehouseId: string;
  quantity: number;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouses: Repository<Warehouse>,
    @InjectRepository(StockItem)
    private readonly stock: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movements: Repository<StockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  // ── warehouses ──
  async createWarehouse(dto: CreateWarehouseDto): Promise<Warehouse> {
    if (dto.isDefault) {
      await this.warehouses.update({ isDefault: true }, { isDefault: false });
    }
    return this.warehouses.save(this.warehouses.create(dto));
  }
  listWarehouses(): Promise<Warehouse[]> {
    return this.warehouses.find({ order: { name: 'ASC' } });
  }

  // ── manual adjustment (INBOUND / OUTBOUND / ADJUSTMENT) ──
  async adjustStock(
    dto: AdjustStockDto,
    userId?: string,
  ): Promise<StockItem> {
    const delta =
      dto.type === StockMovementType.OUTBOUND ? -dto.quantity : dto.quantity;
    return this.dataSource.transaction(async (m) => {
      const item = await this.lockOrCreate(m, dto.sku, dto.warehouseId);
      const next = item.quantity + delta;
      if (next < 0) {
        throw new AppException(
          ErrorCode.STOCK_INSUFFICIENT,
          `Adjustment would make stock negative for ${dto.sku}`,
          HttpStatus.CONFLICT,
        );
      }
      item.quantity = next;
      await m.save(item);
      await this.logMovement(m, {
        sku: dto.sku,
        warehouseId: dto.warehouseId,
        type: dto.type,
        delta,
        quantityAfter: next,
        reason: dto.reason ?? null,
        referenceId: null,
        createdBy: userId ?? null,
      });
      return item;
    });
  }

  // ── transfer between warehouses ──
  async transferStock(
    dto: TransferStockDto,
    userId?: string,
  ): Promise<{ from: StockItem; to: StockItem }> {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'Source and destination warehouses must differ',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.dataSource.transaction(async (m) => {
      const from = await this.lockOrCreate(m, dto.sku, dto.fromWarehouseId);
      if (from.quantity < dto.quantity) {
        throw new AppException(
          ErrorCode.STOCK_INSUFFICIENT,
          `Not enough stock to transfer ${dto.sku}`,
          HttpStatus.CONFLICT,
        );
      }
      const to = await this.lockOrCreate(m, dto.sku, dto.toWarehouseId);
      from.quantity -= dto.quantity;
      to.quantity += dto.quantity;
      await m.save([from, to]);

      const ref = `transfer:${dto.sku}:${Date.now()}`;
      await this.logMovement(m, {
        sku: dto.sku,
        warehouseId: dto.fromWarehouseId,
        type: StockMovementType.TRANSFER,
        delta: -dto.quantity,
        quantityAfter: from.quantity,
        reason: dto.reason ?? null,
        referenceId: ref,
        createdBy: userId ?? null,
      });
      await this.logMovement(m, {
        sku: dto.sku,
        warehouseId: dto.toWarehouseId,
        type: StockMovementType.TRANSFER,
        delta: dto.quantity,
        quantityAfter: to.quantity,
        reason: dto.reason ?? null,
        referenceId: ref,
        createdBy: userId ?? null,
      });
      return { from, to };
    });
  }

  // ── order integration (called inside the order transaction's own manager) ──
  /**
   * Reserve stock for order lines. Single-warehouse-per-line allocation:
   * picks the warehouse with the most available stock. Throws on shortfall.
   */
  async reserveForOrder(
    m: EntityManager,
    lines: OrderLine[],
    referenceId: string,
  ): Promise<Reservation[]> {
    const reservations: Reservation[] = [];
    for (const line of lines) {
      const candidates = await m
        .getRepository(StockItem)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.sku = :sku', { sku: line.sku })
        .getMany();

      const usable = candidates
        .map((c) => ({ c, available: c.quantity - c.reserved }))
        .filter((x) => x.available > 0)
        .sort((a, b) => b.available - a.available);

      const pick = usable.find((x) => x.available >= line.quantity);
      if (!pick) {
        throw new AppException(
          ErrorCode.STOCK_INSUFFICIENT,
          `Insufficient stock for SKU ${line.sku}`,
          HttpStatus.CONFLICT,
          { sku: line.sku, requested: line.quantity },
        );
      }
      pick.c.reserved += line.quantity;
      await m.save(pick.c);
      reservations.push({
        sku: line.sku,
        warehouseId: pick.c.warehouseId,
        quantity: line.quantity,
      });
    }
    return reservations;
  }

  /** Release reservations (order cancelled before fulfillment). */
  async releaseReservations(
    reservations: Reservation[],
    referenceId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      for (const r of reservations) {
        const item = await this.lockOrCreate(m, r.sku, r.warehouseId);
        item.reserved = Math.max(0, item.reserved - r.quantity);
        await m.save(item);
      }
    });
    this.logger.debug(`Released reservations for ${referenceId}`);
  }

  /** Commit reservations on fulfillment: reduce on-hand + reserved, log OUTBOUND. */
  async fulfillReservations(
    reservations: Reservation[],
    referenceId: string,
    userId?: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      for (const r of reservations) {
        const item = await this.lockOrCreate(m, r.sku, r.warehouseId);
        item.quantity = Math.max(0, item.quantity - r.quantity);
        item.reserved = Math.max(0, item.reserved - r.quantity);
        await m.save(item);
        await this.logMovement(m, {
          sku: r.sku,
          warehouseId: r.warehouseId,
          type: StockMovementType.OUTBOUND,
          delta: -r.quantity,
          quantityAfter: item.quantity,
          reason: 'Order fulfillment',
          referenceId,
          createdBy: userId ?? null,
        });
      }
    });
  }

  // ── reads ──
  async listStock(
    query: ListStockQueryDto,
  ): Promise<{ data: StockItem[]; meta: ResponseMeta }> {
    const qb = this.stock.createQueryBuilder('s');
    if (query.warehouseId)
      qb.andWhere('s.warehouseId = :w', { w: query.warehouseId });
    if (query.lowOnly) qb.andWhere('s.quantity <= s.lowStockThreshold');
    if (query.search) qb.andWhere('s.sku ILIKE :s', { s: `%${query.search}%` });
    qb.orderBy('s.sku', 'ASC').skip(query.skip).take(query.limit);

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

  async listMovements(
    query: ListMovementsQueryDto,
  ): Promise<{ data: StockMovement[]; meta: ResponseMeta }> {
    const qb = this.movements.createQueryBuilder('mv');
    if (query.sku) qb.andWhere('mv.sku = :sku', { sku: query.sku });
    if (query.warehouseId)
      qb.andWhere('mv.warehouseId = :w', { w: query.warehouseId });
    if (query.type) qb.andWhere('mv.type = :t', { t: query.type });
    qb.orderBy('mv.createdAt', 'DESC').skip(query.skip).take(query.limit);

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

  lowStockItems(): Promise<StockItem[]> {
    return this.stock
      .createQueryBuilder('s')
      .where('s.quantity <= s.lowStockThreshold')
      .orderBy('s.quantity', 'ASC')
      .getMany();
  }

  async setThreshold(dto: SetThresholdDto): Promise<StockItem> {
    return this.dataSource.transaction(async (m) => {
      const item = await this.lockOrCreate(m, dto.sku, dto.warehouseId);
      item.lowStockThreshold = dto.lowStockThreshold;
      return m.save(item);
    });
  }

  // ── helpers ──
  private async lockOrCreate(
    m: EntityManager,
    sku: string,
    warehouseId: string,
  ): Promise<StockItem> {
    const repo = m.getRepository(StockItem);
    let item = await repo
      .createQueryBuilder('s')
      .setLock('pessimistic_write')
      .where('s.sku = :sku AND s.warehouseId = :w', { sku, w: warehouseId })
      .getOne();
    if (!item) {
      item = repo.create({ sku, warehouseId, quantity: 0, reserved: 0 });
      item = await repo.save(item);
    }
    return item;
  }

  private async logMovement(
    m: EntityManager,
    data: Partial<StockMovement>,
  ): Promise<void> {
    await m.getRepository(StockMovement).save(
      m.getRepository(StockMovement).create(data),
    );
  }
}
