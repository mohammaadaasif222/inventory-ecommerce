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
import {
  PaymentProvider,
  PaymentRecordStatus,
} from '../enums/payment.enum';
import { Refund } from './refund.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({ length: 3, default: 'INR' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentRecordStatus,
    default: PaymentRecordStatus.CREATED,
  })
  status: PaymentRecordStatus;

  /** Provider's order/intent id (razorpay order id, stripe payment_intent id). */
  @Index()
  @Column({ name: 'provider_order_id', type: 'varchar', nullable: true })
  providerOrderId: string | null;

  /** Provider's payment id once captured. */
  @Index()
  @Column({ name: 'provider_payment_id', type: 'varchar', nullable: true })
  providerPaymentId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  raw: Record<string, unknown> | null;

  @OneToMany(() => Refund, (r) => r.payment)
  refunds: Refund[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
