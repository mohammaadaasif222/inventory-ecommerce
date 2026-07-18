import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import { AdminService } from '../admin.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

/**
 * Records an audit entry after any handler annotated with @Audit() completes
 * successfully. Registered globally so it works across every module.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly admin: AdminService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditMeta>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthenticatedUser | undefined;
    const ip = req.ip ?? req.socket?.remoteAddress ?? null;

    return next.handle().pipe(
      tap((result) => {
        void this.admin.record({
          actorId: user?.id ?? null,
          actorEmail: user?.email ?? null,
          action: meta.action,
          entityType: meta.entityType ?? null,
          entityId: this.extractEntityId(req, result),
          metadata: { params: req.params, method: req.method, path: req.path },
          ip,
        });
      }),
    );
  }

  private extractEntityId(req: Request, result: unknown): string | null {
    if (req.params?.id) return String(req.params.id);
    if (
      result &&
      typeof result === 'object' &&
      'id' in (result as Record<string, unknown>)
    ) {
      return String((result as Record<string, unknown>).id);
    }
    return null;
  }
}
