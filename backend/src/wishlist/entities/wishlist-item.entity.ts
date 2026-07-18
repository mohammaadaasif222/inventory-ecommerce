import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('wishlist_items')
// A product is either on a user's wishlist or it isn't — no duplicates.
@Unique('UQ_wishlist_user_product', ['userId', 'productId'])
export class WishlistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Cross-module references kept as plain FK ids (modular-monolith boundary).
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @CreateDateColumn()
  createdAt: Date;
}
