import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer';
import { OrderStatus, PaymentStatus } from '../enums/order-status.enum';
import { OrderItem } from './order-item.entity';

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'order_number', length: 40 })
  orderNumber: string;

  /** Null for guest orders — identity then lives in `guestEmail`. */
  @Index()
  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  /** Where a guest's confirmation goes; null on account-bound orders. */
  @Column({ name: 'guest_email', type: 'varchar', length: 255, nullable: true })
  guestEmail: string | null;

  /**
   * Bearer secret for a guest's own order page. Generated once at creation,
   * returned only in the creation response, checked by the public guest
   * lookup. Unguessable rather than short-lived: the confirmation link in the
   * guest's email must keep working next week.
   */
  @Index()
  @Column({ name: 'guest_token', type: 'varchar', length: 64, nullable: true })
  guestToken: string | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus: PaymentStatus;

  @Column({ length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  subtotal: number;

  @Column({ name: 'discount_total', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  discountTotal: number;

  @Column({ name: 'shipping_total', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  shippingTotal: number;

  @Column({ name: 'tax_total', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  taxTotal: number;

  @Column({ name: 'grand_total', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  grandTotal: number;

  @Column({ name: 'shipping_address', type: 'jsonb', nullable: true })
  shippingAddress: AddressSnapshot | null;

  @Column({ name: 'billing_address', type: 'jsonb', nullable: true })
  billingAddress: AddressSnapshot | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true, eager: true })
  items: OrderItem[];

  @CreateDateColumn({ name: 'placed_at' })
  placedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
