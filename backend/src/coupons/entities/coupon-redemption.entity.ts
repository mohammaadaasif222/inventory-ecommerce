import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer';

/** One row per successful use — backs per-user limits and redemption reporting. */
@Entity('coupon_redemptions')
export class CouponRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'coupon_id', type: 'uuid' })
  couponId: string;

  /**
   * Null for guest redemptions. Only coupons *without* a per-user limit reach
   * this state — `quote()` refuses limited coupons to anonymous carts, since a
   * per-user limit is unenforceable without a user.
   */
  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  /** The discount actually applied, snapshotted at redemption time. */
  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  discountAmount: number = 0;

  @CreateDateColumn()
  createdAt: Date;
}
