import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reviews')
// One review per customer per product; updates go through PATCH.
@Unique('UQ_review_product_user', ['productId', 'userId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Cross-module references kept as plain FK ids (modular-monolith boundary).
  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** Whole stars, 1–5. */
  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'varchar', length: 160, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  /** True when the author has a delivered order containing this product. */
  @Column({ name: 'is_verified_purchase', default: false })
  isVerifiedPurchase: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
