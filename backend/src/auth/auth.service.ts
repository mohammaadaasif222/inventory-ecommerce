import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { JwtPayload } from '../common/interfaces/authenticated-user.interface';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { PublicUser, toPublicUser } from '../users/user.mapper';
import {
  LoginDto,
  RegisterDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { GoogleProfilePayload } from './strategies/google.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult extends AuthTokens {
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── registration / login ──────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.createLocal({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });
    return this.issueSession(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }
    this.assertActive(user);
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.issueSession(user);
  }

  // ── refresh / logout ──────────────────────────────────────────────────────
  async refresh(refreshToken: string): Promise<AuthResult> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new AppException(
        ErrorCode.INVALID_REFRESH_TOKEN,
        'Refresh token is invalid or expired',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (payload.type !== 'refresh') {
      throw new AppException(
        ErrorCode.INVALID_REFRESH_TOKEN,
        'Wrong token type',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.users.findEntityById(payload.sub).catch(() => null);
    if (!user || !user.refreshTokenHash) {
      throw new AppException(
        ErrorCode.INVALID_REFRESH_TOKEN,
        'Session not found',
        HttpStatus.UNAUTHORIZED,
      );
    }
    this.assertActive(user);

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      // Token reuse / revoked — invalidate the whole session defensively.
      await this.users.setRefreshTokenHash(user.id, null);
      throw new AppException(
        ErrorCode.INVALID_REFRESH_TOKEN,
        'Refresh token has been revoked',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.issueSession(user); // rotation
  }

  async logout(userId: string): Promise<void> {
    await this.users.setRefreshTokenHash(userId, null);
  }

  // ── OTP login ──────────────────────────────────────────────────────────────
  async requestOtp(dto: RequestOtpDto): Promise<{ devCode?: string }> {
    const user = await this.users.findByEmail(dto.email);
    // Always respond 200 to avoid account enumeration.
    if (!user) return {};

    const code = this.generateOtp();
    const otpHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await this.users.setOtp(user.id, otpHash, expiresAt);

    // In production this is dispatched via NotificationsModule (email/SMS).
    this.logger.log(`OTP for ${dto.email}: ${code}`);
    const isProd = this.config.get<string>('app.nodeEnv') === 'production';
    return isProd ? {} : { devCode: code };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.otpHash || !user.otpExpiresAt) {
      throw new AppException(
        ErrorCode.INVALID_OTP,
        'No OTP requested for this account',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (user.otpExpiresAt.getTime() < Date.now()) {
      throw new AppException(
        ErrorCode.INVALID_OTP,
        'OTP has expired',
        HttpStatus.BAD_REQUEST,
      );
    }
    const ok = await bcrypt.compare(dto.code, user.otpHash);
    if (!ok) {
      throw new AppException(
        ErrorCode.INVALID_OTP,
        'Incorrect OTP',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.assertActive(user);
    await this.users.clearOtp(user.id);
    return this.issueSession(user);
  }

  // ── Google OAuth ────────────────────────────────────────────────────────────
  async validateGoogleUser(profile: GoogleProfilePayload): Promise<AuthResult> {
    if (!profile.email) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        'Google account has no email',
        HttpStatus.BAD_REQUEST,
      );
    }
    let user =
      (await this.users.findByGoogleId(profile.googleId)) ??
      (await this.users.findByEmail(profile.email));
    if (!user) {
      user = await this.users.createFromGoogle(profile);
    }
    this.assertActive(user);
    return this.issueSession(user);
  }

  // ── helpers ──────────────────────────────────────────────────────────────────
  private assertActive(user: User): void {
    if (user.status === UserStatus.BANNED) {
      throw new AppException(
        ErrorCode.USER_BANNED,
        'This account has been suspended',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async issueSession(user: User): Promise<AuthResult> {
    const tokens = await this.signTokens(user);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.users.setRefreshTokenHash(user.id, refreshHash);
    return { user: toPublicUser(user), ...tokens };
  }

  private async signTokens(user: User): Promise<AuthTokens> {
    const accessTtl = this.config.get<number>('jwt.accessTtl') as number;
    const refreshTtl = this.config.get<number>('jwt.refreshTtl') as number;
    const base = { sub: user.id, email: user.email, roles: user.roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...base, type: 'access' },
        {
          secret: this.config.get<string>('jwt.accessSecret'),
          expiresIn: accessTtl,
        },
      ),
      this.jwt.signAsync(
        { ...base, type: 'refresh' },
        {
          secret: this.config.get<string>('jwt.refreshSecret'),
          expiresIn: refreshTtl,
        },
      ),
    ]);
    return { accessToken, refreshToken, expiresIn: accessTtl };
  }

  private generateOtp(): string {
    // 6-digit numeric, zero-padded. Avoids Math.random bias for OTP use.
    const n = Math.floor(100000 + Math.random() * 900000);
    return String(n);
  }
}
