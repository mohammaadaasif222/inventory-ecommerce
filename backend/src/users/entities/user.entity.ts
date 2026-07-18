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
import { Exclude } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';
import { AuthProvider, UserStatus } from '../enums/user-status.enum';
import { Address } from './address.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  /** Bcrypt hash. Null for OAuth-only accounts. Never serialized. */
  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  lastName: string | null;

  @Column({ type: 'enum', enum: Role, array: true, default: [Role.CUSTOMER] })
  roles: Role[];

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  provider: AuthProvider;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  googleId: string | null;

  @Column({ default: false })
  emailVerified: boolean;

  // Avatar (managed by UploadModule)
  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  avatarStorageId: string | null; // public_id / s3 key / local path

  // OTP login
  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  otpHash: string | null;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  otpExpiresAt: Date | null;

  // Refresh-token rotation: stores hash of the currently valid refresh token
  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  @OneToMany(() => Address, (address) => address.user, { cascade: true })
  addresses: Address[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  get fullName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
  }
}
