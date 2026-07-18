import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer';
import { RateType } from '../enums/shipping.enum';

@Entity('shipping_methods')
export class ShippingMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId: string;

  @Column({ length: 160 })
  name: string;

  @Column({ length: 80, default: 'GENERIC' })
  carrier: string; // Shiprocket / Delhivery / GENERIC

  @Column({ name: 'rate_type', type: 'enum', enum: RateType, default: RateType.FLAT })
  rateType: RateType;

  @Column({ name: 'base_rate', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  baseRate: number;

  @Column({ name: 'per_kg_rate', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  perKgRate: number;

  /** Free shipping when cart total ≥ this (PRICE rate type). */
  @Column({ name: 'free_above', type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: numericTransformer })
  freeAbove: number | null;

  @Column({ name: 'estimated_days', type: 'int', default: 5 })
  estimatedDays: number;

  @Column({ default: true })
  isActive: boolean;
}
