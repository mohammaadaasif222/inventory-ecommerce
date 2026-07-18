import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StockMovementType } from '../enums/stock-movement-type.enum';

/** Immutable ledger of every stock change. */
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 80 })
  sku: string;

  @Index()
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  /** Signed delta applied to quantity (+inbound / -outbound). */
  @Column({ type: 'int' })
  delta: number;

  @Column({ name: 'quantity_after', type: 'int' })
  quantityAfter: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** Linking id (e.g. order id, transfer id). */
  @Index()
  @Column({ name: 'reference_id', type: 'varchar', nullable: true })
  referenceId: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
