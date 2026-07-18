import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Index({ unique: true })
  @Column({ length: 80 })
  sku: string;

  /** Attribute value map, e.g. { size: 'M', color: 'Red', material: 'Cotton' }. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  attributes: Record<string, string>;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  price: number | null;

  @Column({
    name: 'compare_at_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  compareAtPrice: number | null;

  @Column({ type: 'varchar', nullable: true })
  barcode: string | null;

  @Column({ name: 'weight_grams', type: 'int', default: 0 })
  weightGrams: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
