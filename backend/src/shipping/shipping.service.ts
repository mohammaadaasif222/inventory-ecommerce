import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingZone } from './entities/shipping-zone.entity';
import { ShippingMethod } from './entities/shipping-method.entity';
import { Shipment } from './entities/shipment.entity';
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

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(ShippingZone)
    private readonly zones: Repository<ShippingZone>,
    @InjectRepository(ShippingMethod)
    private readonly methods: Repository<ShippingMethod>,
    @InjectRepository(Shipment)
    private readonly shipments: Repository<Shipment>,
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
  createShipment(dto: CreateShipmentDto): Promise<Shipment> {
    return this.shipments.save(
      this.shipments.create({
        orderId: dto.orderId,
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber ?? null,
        status: dto.trackingNumber
          ? ShipmentStatus.LABEL_GENERATED
          : ShipmentStatus.CREATED,
      }),
    );
  }

  listShipments(orderId?: string): Promise<Shipment[]> {
    return this.shipments.find({
      where: orderId ? { orderId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async updateShipmentStatus(
    id: string,
    dto: UpdateShipmentStatusDto,
  ): Promise<Shipment> {
    const shipment = await this.shipments.findOne({ where: { id } });
    if (!shipment)
      throw new AppException(ErrorCode.NOT_FOUND, 'Shipment not found', HttpStatus.NOT_FOUND);
    shipment.status = dto.status;
    if (dto.trackingNumber) shipment.trackingNumber = dto.trackingNumber;
    shipment.lastPolledAt = new Date();
    return this.shipments.save(shipment);
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
