import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * On-hand stock for a variant SKU within a warehouse.
 * available = quantity - reserved.
 */
@Entity('stock_items')
@Index(['sku', 'warehouseId'], { unique: true })
export class StockItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 80 })
  sku: string;

  @Index()
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  /** Held for unfulfilled orders; not yet shipped. */
  @Column({ type: 'int', default: 0 })
  reserved: number;

  @Column({ name: 'low_stock_threshold', type: 'int', default: 5 })
  lowStockThreshold: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
