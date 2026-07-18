import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer';
import { CouponType } from '../enums/coupon.enum';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stored upper-cased; lookups normalise the input the same way. */
  @Index({ unique: true })
  @Column({ length: 40 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: CouponType })
  type: CouponType;

  /** Percentage (0–100) for PERCENT, currency amount for FIXED, unused for FREE_SHIPPING. */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  value: number = 0;

  /** Minimum order subtotal required to use the coupon. */
  @Column({
    name: 'min_spend',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  minSpend: number = 0;

  /** Upper bound on a PERCENT discount; null means uncapped. */
  @Column({
    name: 'max_discount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  maxDiscount: number | null;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  /** Total redemptions allowed across all customers; null means unlimited. */
  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number = 0;

  /** Redemptions allowed per customer; null means unlimited. */
  @Column({ name: 'per_user_limit', type: 'int', nullable: true })
  perUserLimit: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean = true;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
