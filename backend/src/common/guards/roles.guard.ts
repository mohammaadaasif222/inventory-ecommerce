import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { ErrorCode } from '../exceptions/app.exception';

/**
 * Allows the request only if the authenticated user has at least one of the
 * roles declared via @Roles(). SUPER_ADMIN always passes. Must run after
 * JwtAuthGuard (which populates request.user).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest()
      .user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No authenticated user on request',
      });
    }

    if (user.roles.includes(Role.SUPER_ADMIN)) return true;

    const allowed = user.roles.some((r) => required.includes(r));
    if (!allowed) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: `Requires one of roles: ${required.join(', ')}`,
      });
    }
    return true;
  }
}
