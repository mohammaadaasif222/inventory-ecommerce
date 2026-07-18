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
import { CartItem } from './cart-item.entity';

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  /** Flagged by the sweeper as idle; a recovery email may have been sent. */
  ABANDONED = 'ABANDONED',
  /** The customer checked out — terminal, never swept again. */
  CONVERTED = 'CONVERTED',
}

/**
 * Server-side mirror of the browser cart, synced while the customer is signed
 * in. The zustand store stays the source of truth for cart UX; this exists so
 * an idle cart can be detected and recovered by email.
 */
@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** One live cart per customer. */
  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ type: 'enum', enum: CartStatus, default: CartStatus.ACTIVE })
  status: CartStatus = CartStatus.ACTIVE;

  // Explicit types on initialised columns: without an annotation TypeScript
  // emits design:type Object and TypeORM can't map the column.
  @Column({ length: 3, default: 'INR' })
  currency: string = 'INR';

  /** Cached from the synced lines so the sweeper needn't re-add them. */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  subtotal: number = 0;

  /** Bumped on every sync — this is what "idle for N hours" measures. */
  @Index()
  @Column({ name: 'last_activity_at', type: 'timestamptz' })
  lastActivityAt: Date;

  @Column({ name: 'recovery_email_sent_at', type: 'timestamptz', nullable: true })
  recoveryEmailSentAt: Date | null;

  @OneToMany(() => CartItem, (i) => i.cart, { cascade: true, eager: true })
  items: CartItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
