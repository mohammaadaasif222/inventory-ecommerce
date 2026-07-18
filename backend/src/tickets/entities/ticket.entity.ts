import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  TicketPriority,
  TicketSource,
  TicketStatus,
} from '../enums/ticket.enum';
import { TicketNote } from './ticket-note.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'ticket_number', length: 40 })
  ticketNumber: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Index()
  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string | null;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Column({ type: 'enum', enum: TicketSource, default: TicketSource.MANUAL })
  source: TicketSource;

  /** Originating chat (when escalated from live chat). */
  @Column({ name: 'chat_id', type: 'varchar', nullable: true })
  chatId: string | null;

  @Column({ name: 'first_response_at', type: 'timestamptz', nullable: true })
  firstResponseAt: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'due_response_at', type: 'timestamptz', nullable: true })
  dueResponseAt: Date | null;

  @Column({ name: 'due_resolution_at', type: 'timestamptz', nullable: true })
  dueResolutionAt: Date | null;

  @Column({ name: 'sla_breached', default: false })
  slaBreached: boolean;

  @OneToMany(() => TicketNote, (n) => n.ticket, { cascade: true })
  notes: TicketNote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
