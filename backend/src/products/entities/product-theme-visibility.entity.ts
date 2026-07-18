import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Per-theme product visibility override.
 *
 * No row = visible (subject to the theme's category scope), so new products
 * appear everywhere by default and nothing needs bookkeeping. A `visible:
 * false` row hides the product in that one theme — written per-product from
 * the admin, or in bulk by the theme-switch migration dialog ("include
 * perfume products in the general store?"). Products are never deleted or
 * altered by a switch; flipping themes back restores everything.
 */
@Entity('product_theme_visibility')
@Unique(['productId', 'themeSlug'])
export class ProductThemeVisibility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'theme_slug', length: 80 })
  themeSlug: string;

  @Column({ default: true })
  visible: boolean;
}
