import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ShipmentStatus } from '../enums/shipping.enum';

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ length: 80 })
  carrier: string;

  @Index()
  @Column({ name: 'tracking_number', type: 'varchar', nullable: true })
  trackingNumber: string | null;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.CREATED })
  status: ShipmentStatus;

  @Column({ name: 'last_polled_at', type: 'timestamptz', nullable: true })
  lastPolledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
