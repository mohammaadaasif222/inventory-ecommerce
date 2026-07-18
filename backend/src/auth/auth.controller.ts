import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleProfilePayload } from './strategies/google.strategy';
import {
  LoginDto,
  RefreshDto,
  RegisterDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ResponseMessage('Registration successful')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Login successful')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Token refreshed')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logged out')
  async logout(@CurrentUser('id') userId: string) {
    await this.auth.logout(userId);
    return { loggedOut: true };
  }

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('OTP sent if the account exists')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('OTP verified')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  // ── Google OAuth2 ───────────────────────────────────────────────────────────
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleAuth(): void {
    // Guard initiates the redirect to Google's consent screen.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as GoogleProfilePayload;
    const result = await this.auth.validateGoogleUser(profile);
    const frontend = this.config.get<string>('app.frontendUrl');
    // Hand tokens to the SPA via a fragment it can read and store.
    const url = new URL('/auth/callback', frontend);
    url.hash = `access_token=${result.accessToken}&refresh_token=${result.refreshToken}`;
    res.redirect(url.toString());
  }
}
