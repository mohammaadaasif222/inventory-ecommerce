import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer';
import { ProductVariant } from './product-variant.entity';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface ProductImage {
  url: string;
  storageId: string;
  provider: string;
  isPrimary: boolean;
  sortOrder: number;
  width?: number;
  height?: number;
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 200 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Cross-module references kept as plain FK ids (modular-monolith boundary).
  @Index()
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Index()
  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  tags: string[];

  @Column({
    name: 'base_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  basePrice: number;

  @Column({ length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  images: ProductImage[];

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus;

  /**
   * Denormalised review aggregate, recomputed by ReviewsService on every
   * review write. Kept on the product so listing can filter/sort by rating
   * without joining the reviews table.
   *
   * Initialised here, not just via `default`: numericTransformer maps an
   * unset value to null, which would be inserted over the column default and
   * violate NOT NULL.
   */
  @Index()
  @Column({
    name: 'rating_average',
    type: 'numeric',
    precision: 2,
    scale: 1,
    default: 0,
    transformer: numericTransformer,
  })
  ratingAverage: number = 0;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number = 0;

  /** Owning vendor (for VENDOR role); null for store-owned. */
  @Index()
  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId: string | null;

  @OneToMany(() => ProductVariant, (v) => v.product, {
    cascade: true,
    eager: true,
  })
  variants: ProductVariant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
