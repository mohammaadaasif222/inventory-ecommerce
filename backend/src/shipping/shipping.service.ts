import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ShippingZone } from './entities/shipping-zone.entity';
import { ShippingMethod } from './entities/shipping-method.entity';
import { Shipment } from './entities/shipment.entity';
import { ShipmentEvent } from './entities/shipment-event.entity';
import { Order } from '../orders/entities/order.entity';
import { RateType, ShipmentStatus } from './enums/shipping.enum';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import {
  CalculateRatesDto,
  CreateMethodDto,
  CreateShipmentDto,
  CreateZoneDto,
  UpdateMethodDto,
  UpdateShipmentStatusDto,
  UpdateZoneDto,
} from './dto/shipping.dto';

export interface RateQuote {
  methodId: string;
  name: string;
  carrier: string;
  cost: number;
  estimatedDays: number;
  free: boolean;
}

export type ShipmentWithEvents = Shipment & { events: ShipmentEvent[] };

/** Public tracking view — no ids, so a tracking number leaks nothing else. */
export interface PublicTracking {
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  createdAt: Date;
  updatedAt: Date;
  events: { status: ShipmentStatus; note: string | null; createdAt: Date }[];
}

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(ShippingZone)
    private readonly zones: Repository<ShippingZone>,
    @InjectRepository(ShippingMethod)
    private readonly methods: Repository<ShippingMethod>,
    @InjectRepository(Shipment)
    private readonly shipments: Repository<Shipment>,
    @InjectRepository(ShipmentEvent)
    private readonly events: Repository<ShipmentEvent>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
  ) {}

  // ── zones ──
  createZone(dto: CreateZoneDto): Promise<ShippingZone> {
    return this.zones.save(this.zones.create(dto));
  }
  listZones(): Promise<ShippingZone[]> {
    return this.zones.find({ order: { name: 'ASC' } });
  }
  async updateZone(id: string, dto: UpdateZoneDto): Promise<ShippingZone> {
    const zone = await this.zones.findOne({ where: { id } });
    if (!zone)
      throw new AppException(ErrorCode.NOT_FOUND, 'Zone not found', HttpStatus.NOT_FOUND);
    Object.assign(zone, dto);
    return this.zones.save(zone);
  }
  async removeZone(id: string): Promise<void> {
    await this.zones.delete({ id });
  }

  // ── methods ──
  async createMethod(dto: CreateMethodDto): Promise<ShippingMethod> {
    await this.getZone(dto.zoneId);
    return this.methods.save(this.methods.create(dto));
  }
  listMethods(zoneId?: string): Promise<ShippingMethod[]> {
    return this.methods.find({
      where: zoneId ? { zoneId } : {},
      order: { name: 'ASC' },
    });
  }
  async updateMethod(
    id: string,
    dto: UpdateMethodDto,
  ): Promise<ShippingMethod> {
    const method = await this.methods.findOne({ where: { id } });
    if (!method)
      throw new AppException(ErrorCode.NOT_FOUND, 'Method not found', HttpStatus.NOT_FOUND);
    Object.assign(method, dto);
    return this.methods.save(method);
  }
  async removeMethod(id: string): Promise<void> {
    await this.methods.delete({ id });
  }

  // ── rate calculation ──
  async calculateRates(dto: CalculateRatesDto): Promise<RateQuote[]> {
    const zones = await this.zones.find({ where: { isActive: true } });
    const zone = zones.find((z) =>
      z.countries.map((c) => c.toUpperCase()).includes(dto.country.toUpperCase()),
    );
    if (!zone) return [];

    const methods = await this.methods.find({
      where: { zoneId: zone.id, isActive: true },
    });
    const weightKg = (dto.weightGrams ?? 0) / 1000;
    const orderTotal = dto.orderTotal ?? 0;

    return methods.map((m) => {
      let cost = m.baseRate;
      let free = false;
      switch (m.rateType) {
        case RateType.FLAT:
          cost = m.baseRate;
          break;
        case RateType.WEIGHT:
          cost = m.baseRate + m.perKgRate * weightKg;
          break;
        case RateType.PRICE:
          if (m.freeAbove !== null && orderTotal >= m.freeAbove) {
            cost = 0;
            free = true;
          } else {
            cost = m.baseRate;
          }
          break;
      }
      return {
        methodId: m.id,
        name: m.name,
        carrier: m.carrier,
        cost: Math.round(cost * 100) / 100,
        estimatedDays: m.estimatedDays,
        free,
      };
    });
  }

  // ── shipments / tracking ──
  async createShipment(dto: CreateShipmentDto): Promise<Shipment> {
    const order = await this.orders.findOne({ where: { id: dto.orderId } });
    if (!order)
      throw new AppException(ErrorCode.NOT_FOUND, 'Order not found', HttpStatus.NOT_FOUND);

    const shipment = await this.shipments.save(
      this.shipments.create({
        orderId: dto.orderId,
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber ?? null,
        status: dto.trackingNumber
          ? ShipmentStatus.LABEL_GENERATED
          : ShipmentStatus.CREATED,
      }),
    );
    await this.recordEvent(
      shipment.id,
      shipment.status,
      dto.trackingNumber
        ? `Label generated with ${dto.carrier} (${dto.trackingNumber})`
        : `Shipment created with ${dto.carrier}`,
    );
    return shipment;
  }

  async listShipments(orderId?: string): Promise<ShipmentWithEvents[]> {
    const shipments = await this.shipments.find({
      where: orderId ? { orderId } : {},
      order: { createdAt: 'DESC' },
    });
    return this.withEvents(shipments);
  }

  /** A customer's shipments for their own order — 404 on anyone else's. */
  async shipmentsForOwnedOrder(
    orderId: string,
    userId: string,
  ): Promise<ShipmentWithEvents[]> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order || order.customerId !== userId) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Order not found', HttpStatus.NOT_FOUND);
    }
    return this.listShipments(orderId);
  }

  /** Public track-by-number: latest shipment carrying that number, id-free. */
  async trackByNumber(trackingNumber: string): Promise<PublicTracking> {
    const shipment = await this.shipments.findOne({
      where: { trackingNumber },
      order: { createdAt: 'DESC' },
    });
    if (!shipment)
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'No shipment found for that tracking number',
        HttpStatus.NOT_FOUND,
      );
    const [withEvents] = await this.withEvents([shipment]);
    return {
      carrier: shipment.carrier,
      trackingNumber,
      status: shipment.status,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
      events: withEvents.events.map((e) => ({
        status: e.status,
        note: e.note,
        createdAt: e.createdAt,
      })),
    };
  }

  async updateShipmentStatus(
    id: string,
    dto: UpdateShipmentStatusDto,
  ): Promise<Shipment> {
    const shipment = await this.shipments.findOne({ where: { id } });
    if (!shipment)
      throw new AppException(ErrorCode.NOT_FOUND, 'Shipment not found', HttpStatus.NOT_FOUND);
    const changed =
      shipment.status !== dto.status ||
      (dto.trackingNumber && dto.trackingNumber !== shipment.trackingNumber);
    shipment.status = dto.status;
    if (dto.trackingNumber) shipment.trackingNumber = dto.trackingNumber;
    shipment.lastPolledAt = new Date();
    const saved = await this.shipments.save(shipment);
    if (changed || dto.note) {
      await this.recordEvent(saved.id, dto.status, dto.note ?? null);
    }
    return saved;
  }

  /** Append a checkpoint to a shipment's timeline. */
  private recordEvent(
    shipmentId: string,
    status: ShipmentStatus,
    note: string | null,
  ): Promise<ShipmentEvent> {
    return this.events.save(this.events.create({ shipmentId, status, note }));
  }

  /** Attach each shipment's timeline (oldest first) in one query. */
  private async withEvents(shipments: Shipment[]): Promise<ShipmentWithEvents[]> {
    if (shipments.length === 0) return [];
    const events = await this.events.find({
      where: { shipmentId: In(shipments.map((s) => s.id)) },
      order: { createdAt: 'ASC' },
    });
    const byShipment = new Map<string, ShipmentEvent[]>();
    for (const event of events) {
      const list = byShipment.get(event.shipmentId) ?? [];
      list.push(event);
      byShipment.set(event.shipmentId, list);
    }
    return shipments.map((s) =>
      Object.assign(s, { events: byShipment.get(s.id) ?? [] }),
    );
  }

  /** Shipments still in flight — polled by the tracking BullMQ job. */
  activeShipments(): Promise<Shipment[]> {
    return this.shipments
      .createQueryBuilder('s')
      .where('s.trackingNumber IS NOT NULL')
      .andWhere('s.status NOT IN (:...done)', {
        done: [
          ShipmentStatus.DELIVERED,
          ShipmentStatus.RETURNED,
          ShipmentStatus.FAILED,
        ],
      })
      .getMany();
  }

  markPolled(id: string, status: ShipmentStatus): Promise<unknown> {
    return this.shipments.update(
      { id },
      { status, lastPolledAt: new Date() },
    );
  }

  private async getZone(id: string): Promise<ShippingZone> {
    const zone = await this.zones.findOne({ where: { id } });
    if (!zone)
      throw new AppException(ErrorCode.NOT_FOUND, 'Zone not found', HttpStatus.NOT_FOUND);
    return zone;
  }
}
