import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UsersService } from '../../users/users.service';
import { UserStatus } from '../../users/enums/user-status.enum';
import { ErrorCode } from '../../common/exceptions/app.exception';

/** Validates the access token and resolves request.user. Blocks banned users. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret') as string,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Wrong token type',
      });
    }
    const user = await this.users.findEntityById(payload.sub).catch(() => null);
    if (!user || user.status === UserStatus.BANNED) {
      throw new UnauthorizedException({
        code: ErrorCode.USER_BANNED,
        message: 'Account is not active',
      });
    }
    return { id: user.id, email: user.email, roles: user.roles };
  }
}
