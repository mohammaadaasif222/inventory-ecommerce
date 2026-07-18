import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TicketPriority } from '../enums/ticket.enum';

/** SLA targets (minutes) per priority. */
@Entity('sla_configs')
export class SlaConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'enum', enum: TicketPriority })
  priority: TicketPriority;

  @Column({ name: 'response_minutes', type: 'int' })
  responseMinutes: number;

  @Column({ name: 'resolution_minutes', type: 'int' })
  resolutionMinutes: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
