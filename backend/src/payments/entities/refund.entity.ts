import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer';
import { RefundStatus } from '../enums/payment.enum';
import { Payment } from './payment.entity';

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, (p) => p.refunds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Index()
  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({ type: 'enum', enum: RefundStatus, default: RefundStatus.CREATED })
  status: RefundStatus;

  @Column({ name: 'provider_refund_id', type: 'varchar', nullable: true })
  providerRefundId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
