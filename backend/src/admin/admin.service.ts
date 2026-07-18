import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { ResponseMeta } from '../common/interfaces/api-response.interface';

export interface RecordAuditInput {
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.auditRepo.save(this.auditRepo.create(input));
    } catch (err) {
      // Auditing must never break the underlying request.
      this.logger.error('Failed to write audit log', err as Error);
    }
  }

  async listAuditLogs(
    query: PaginationQueryDto,
  ): Promise<{ data: AuditLog[]; meta: ResponseMeta }> {
    const qb = this.auditRepo.createQueryBuilder('log');
    if (query.search) {
      qb.where(
        'log.action ILIKE :s OR log.actorEmail ILIKE :s OR log.entityType ILIKE :s',
        { s: `%${query.search}%` },
      );
    }
    qb.orderBy('log.createdAt', 'DESC').skip(query.skip).take(query.limit);
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

  /** Static role → permissions matrix surfaced to the admin UI. */
  getPermissionMatrix() {
    return {
      SUPER_ADMIN: ['*'],
      ADMIN: [
        'users:read',
        'users:ban',
        'products:*',
        'orders:*',
        'inventory:*',
        'config:*',
        'storage:*',
      ],
      VENDOR: ['products:own', 'orders:own', 'inventory:own'],
      SUPPORT_AGENT: ['chat:*', 'tickets:*', 'users:read'],
      CUSTOMER: ['self:*'],
    };
  }
}
