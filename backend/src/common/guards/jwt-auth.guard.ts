import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from '../decorators/optional-auth.decorator';
import { ErrorCode } from '../exceptions/app.exception';

/**
 * Validates the Bearer access token via the 'jwt' Passport strategy.
 *
 * Three modes, by decorator:
 *  - default        — token required; missing/invalid → 401
 *  - @Public()      — never authenticates; user is always undefined
 *  - @OptionalAuth()— no token → anonymous; a token, once presented, must be
 *                     valid (a bad claim is refused, not downgraded to guest)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    if (this.isOptional(context)) {
      const req = context.switchToHttp().getRequest<Request>();
      // No credentials offered: skip the strategy entirely rather than run it
      // to a guaranteed failure that handleRequest would then have to excuse.
      if (!req.headers.authorization) return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: this.isOptional(context)
          ? 'The provided token is invalid — omit it to continue as a guest'
          : 'Authentication required or token is invalid',
      });
    }
    return user;
  }

  private isOptional(context: ExecutionContext): boolean {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }
}
