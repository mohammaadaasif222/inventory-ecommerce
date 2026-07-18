import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ViewerType = '3d' | '360' | 'static';
export type ViewerBackground =
  | 'studio-light'
  | 'dark-luxury'
  | 'gradient'
  | 'transparent';

/** The JSON shape the storefront viewer consumes, stored verbatim. */
export interface ViewerConfigJson {
  type: ViewerType;
  /** .glb/.gltf asset for the 3d mode. */
  modelUrl?: string;
  /** Ordered turntable frames for the 360 mode. */
  images?: string[];
  autoRotate?: boolean;
  /** Orbit auto-rotate speed / 360 frames-per-second-ish factor. */
  rotateSpeed?: number;
  background?: ViewerBackground;
  /** Camera distance bounds and start, as multiples of the model radius. */
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
}

/**
 * Per-product 3D/360 viewer settings — one row per product, config as JSONB
 * so the widget can grow fields without migrations.
 */
@Entity('product_viewer_configs')
export class ViewerConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'jsonb' })
  config: ViewerConfigJson;

  @UpdateDateColumn()
  updatedAt: Date;
}
