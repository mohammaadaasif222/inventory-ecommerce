import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShipmentStatus } from '../enums/shipping.enum';

/**
 * One checkpoint in a shipment's journey — written on creation and on every
 * status change, so customers see a timeline rather than a bare status.
 */
@Entity('shipment_events')
export class ShipmentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'shipment_id', type: 'uuid' })
  shipmentId: string;

  @Column({ type: 'enum', enum: ShipmentStatus })
  status: ShipmentStatus;

  /** Free-text detail: "Handed to carrier", "Out from Mumbai hub", … */
  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
