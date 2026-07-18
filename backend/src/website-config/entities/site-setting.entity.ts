import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ConfigSection =
  | 'general'
  | 'seo'
  | 'social'
  | 'scripts'
  | 'maintenance';

/**
 * Generic key-value store for site settings. `value` is JSONB so any shape can
 * be stored. `isPublic` controls exposure via the unauthenticated /config/public
 * endpoint (cached in Redis).
 */
@Entity('site_settings')
export class SiteSetting {
  @PrimaryColumn({ length: 160 })
  key: string;

  @Column({ type: 'jsonb', nullable: true })
  value: unknown;

  @Column({
    type: 'enum',
    enum: ['general', 'seo', 'social', 'scripts', 'maintenance'],
    default: 'general',
  })
  section: ConfigSection;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
