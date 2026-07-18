import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  user: User;

  @Column({ length: 120 })
  label: string; // e.g. "Home", "Office"

  @Column({ length: 120 })
  fullName: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255 })
  line1: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  line2: string | null;

  @Column({ length: 120 })
  city: string;

  @Column({ length: 120 })
  state: string;

  @Column({ length: 20 })
  postalCode: string;

  @Column({ length: 2, default: 'IN' })
  country: string;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
