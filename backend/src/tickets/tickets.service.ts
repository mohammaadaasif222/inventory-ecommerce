import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketNote } from './entities/ticket-note.entity';
import { SlaConfig } from './entities/sla-config.entity';
import {
  DEFAULT_SLA,
  TICKET_TRANSITIONS,
  TicketPriority,
  TicketSource,
  TicketStatus,
} from './enums/ticket.enum';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { ResponseMeta } from '../common/interfaces/api-response.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '../notifications/enums/notification.enum';
import { UsersService } from '../users/users.service';
import {
  AddNoteDto,
  CreateTicketDto,
  EmailIngestDto,
  ListTicketsQueryDto,
  UpsertSlaDto,
} from './dto/ticket.dto';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(TicketNote)
    private readonly notes: Repository<TicketNote>,
    @InjectRepository(SlaConfig)
    private readonly slas: Repository<SlaConfig>,
    private readonly notifications: NotificationsService,
    private readonly users: UsersService,
  ) {}

  // ── creation ──
  async create(
    dto: CreateTicketDto,
    customerId: string,
    source = TicketSource.MANUAL,
    chatId?: string,
  ): Promise<Ticket> {
    const priority = dto.priority ?? TicketPriority.MEDIUM;
    const sla = await this.getSla(priority);
    const now = Date.now();
    const ticket = this.tickets.create({
      ticketNumber: this.generateNumber(),
      subject: dto.subject,
      description: dto.description ?? null,
      customerId,
      priority,
      source,
      chatId: chatId ?? null,
      status: TicketStatus.OPEN,
      dueResponseAt: new Date(now + sla.responseMinutes * 60_000),
      dueResolutionAt: new Date(now + sla.resolutionMinutes * 60_000),
    });
    return this.tickets.save(ticket);
  }

  createFromChat(
    chatId: string,
    customerId: string,
    subject: string,
    description?: string,
  ): Promise<Ticket> {
    return this.create(
      { subject, description, priority: TicketPriority.MEDIUM },
      customerId,
      TicketSource.CHAT,
      chatId,
    );
  }

  async ingestEmail(dto: EmailIngestDto): Promise<Ticket> {
    // In production, customerId is resolved from `from` via UsersService.
    const existing = dto.customerId
      ? null
      : await this.users.findByEmail(dto.from).catch(() => null);
    const customerId = dto.customerId ?? existing?.id ?? 'unknown';
    return this.create(
      { subject: dto.subject, description: dto.body },
      customerId,
      TicketSource.EMAIL,
    );
  }

  // ── reads ──
  async list(
    query: ListTicketsQueryDto,
  ): Promise<{ data: Ticket[]; meta: ResponseMeta }> {
    const qb = this.tickets.createQueryBuilder('t');
    if (query.status) qb.andWhere('t.status = :s', { s: query.status });
    if (query.priority) qb.andWhere('t.priority = :p', { p: query.priority });
    if (query.assigneeId)
      qb.andWhere('t.assigneeId = :a', { a: query.assigneeId });
    if (query.search)
      qb.andWhere('(t.subject ILIKE :q OR t.ticketNumber ILIKE :q)', {
        q: `%${query.search}%`,
      });
    qb.orderBy('t.createdAt', 'DESC').skip(query.skip).take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.tickets.findOne({
      where: { id },
      relations: { notes: true },
    });
    if (!ticket) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Ticket not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return ticket;
  }

  // ── mutations ──
  async updateStatus(id: string, next: TicketStatus): Promise<Ticket> {
    const ticket = await this.findOne(id);
    if (!TICKET_TRANSITIONS[ticket.status].includes(next)) {
      throw new AppException(
        ErrorCode.INVALID_STATUS_TRANSITION,
        `Cannot move ticket from ${ticket.status} to ${next}`,
        HttpStatus.CONFLICT,
      );
    }
    ticket.status = next;
    if (next === TicketStatus.RESOLVED && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
    return this.tickets.save(ticket);
  }

  async assign(id: string, assigneeId: string): Promise<Ticket> {
    const ticket = await this.findOne(id);
    ticket.assigneeId = assigneeId;
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }
    return this.tickets.save(ticket);
  }

  async setPriority(id: string, priority: TicketPriority): Promise<Ticket> {
    const ticket = await this.findOne(id);
    const sla = await this.getSla(priority);
    const base = ticket.createdAt.getTime();
    ticket.priority = priority;
    ticket.dueResponseAt = new Date(base + sla.responseMinutes * 60_000);
    ticket.dueResolutionAt = new Date(base + sla.resolutionMinutes * 60_000);
    return this.tickets.save(ticket);
  }

  async addNote(
    id: string,
    authorId: string,
    dto: AddNoteDto,
  ): Promise<TicketNote> {
    const ticket = await this.findOne(id);
    const note = await this.notes.save(
      this.notes.create({
        ticketId: ticket.id,
        authorId,
        body: dto.body,
        isInternal: dto.isInternal ?? false,
      }),
    );
    // First public reply satisfies the response SLA.
    if (!dto.isInternal && !ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
      await this.tickets.save(ticket);
    }
    return note;
  }

  /** Customer-visible notes only (internal notes hidden). */
  async publicNotes(id: string): Promise<TicketNote[]> {
    await this.findOne(id);
    return this.notes.find({
      where: { ticketId: id, isInternal: false },
      order: { createdAt: 'ASC' },
    });
  }

  // ── SLA config ──
  async getSla(priority: TicketPriority): Promise<SlaConfig> {
    let cfg = await this.slas.findOne({ where: { priority } });
    if (!cfg) {
      cfg = await this.slas.save(
        this.slas.create({ priority, ...DEFAULT_SLA[priority] }),
      );
    }
    return cfg;
  }
  listSla(): Promise<SlaConfig[]> {
    return this.slas.find();
  }
  async upsertSla(dto: UpsertSlaDto): Promise<SlaConfig> {
    const cfg = (await this.slas.findOne({ where: { priority: dto.priority } }))
      ?? this.slas.create({ priority: dto.priority });
    cfg.responseMinutes = dto.responseMinutes;
    cfg.resolutionMinutes = dto.resolutionMinutes;
    return this.slas.save(cfg);
  }

  /** Scan for SLA breaches; flag + alert the assignee. Run by BullMQ. */
  async checkSlaBreaches(): Promise<{ breached: number }> {
    const now = new Date();
    const open = await this.tickets.find({
      where: [
        { slaBreached: false, dueResolutionAt: LessThan(now) },
      ],
    });
    const candidates = open.filter(
      (t) =>
        t.status !== TicketStatus.RESOLVED &&
        t.status !== TicketStatus.CLOSED,
    );

    for (const ticket of candidates) {
      ticket.slaBreached = true;
      await this.tickets.save(ticket);
      this.logger.warn(
        `SLA breach: ticket ${ticket.ticketNumber} (${ticket.priority})`,
      );
      await this.alertBreach(ticket).catch(() => undefined);
    }
    return { breached: candidates.length };
  }

  // ── helpers ──
  private async alertBreach(ticket: Ticket): Promise<void> {
    if (!ticket.assigneeId) return;
    const assignee = await this.users
      .findEntityById(ticket.assigneeId)
      .catch(() => null);
    if (!assignee?.email) return;
    await this.notifications.send({
      channel: NotificationChannel.EMAIL,
      to: assignee.email,
      templateKey: 'ticket.sla_breach',
      userId: assignee.id,
      data: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
      },
    });
  }

  private generateNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `TKT-${ts}-${rand}`;
  }
}
