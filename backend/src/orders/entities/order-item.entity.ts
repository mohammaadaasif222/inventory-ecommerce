import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer';
import { Order } from './order.entity';

/** Line item with a price/name snapshot taken at order time. */
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId: string | null;

  @Column({ length: 80 })
  sku: string;

  @Column({ name: 'name_snapshot', length: 255 })
  nameSnapshot: string;

  @Column({ name: 'attributes_snapshot', type: 'jsonb', default: () => "'{}'" })
  attributesSnapshot: Record<string, string>;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'fulfilled_quantity', type: 'int', default: 0 })
  fulfilledQuantity: number;

  /** Warehouse the stock was reserved from. */
  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouseId: string | null;

  @Column({
    name: 'line_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  lineTotal: number;
}
