import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StorageProviderType } from '../providers/storage-provider.interface';

/**
 * Singleton storage configuration. One active row controls which provider the
 * UploadModule uses. Secret columns (api_key, api_secret, access_key,
 * secret_key) are stored AES-256-GCM encrypted — never in plaintext.
 */
@Entity('storage_config')
export class StorageConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['cloudinary', 's3', 'local'],
    default: 'local',
  })
  provider: StorageProviderType;

  // Cloudinary
  @Column({ name: 'cloudinary_cloud_name', type: 'varchar', nullable: true })
  cloudinaryCloudName: string | null;

  /** encrypted */
  @Column({ name: 'cloudinary_api_key', type: 'varchar', nullable: true })
  cloudinaryApiKey: string | null;

  /** encrypted */
  @Column({ name: 'cloudinary_api_secret', type: 'varchar', nullable: true })
  cloudinaryApiSecret: string | null;

  // S3
  /** encrypted */
  @Column({ name: 's3_access_key', type: 'varchar', nullable: true })
  s3AccessKey: string | null;

  /** encrypted */
  @Column({ name: 's3_secret_key', type: 'varchar', nullable: true })
  s3SecretKey: string | null;

  @Column({ name: 's3_bucket', type: 'varchar', nullable: true })
  s3Bucket: string | null;

  @Column({ name: 's3_region', type: 'varchar', nullable: true })
  s3Region: string | null;

  @Column({ name: 's3_endpoint', type: 'varchar', nullable: true })
  s3Endpoint: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
