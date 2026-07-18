import { Module, Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

/**
 * Registers the Google strategy only when credentials are present, so the app
 * still boots in environments without OAuth configured.
 */
const googleStrategyProvider: Provider = {
  provide: 'GOOGLE_STRATEGY',
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    if (!config.get<string>('google.clientId')) return null;
    return new GoogleStrategy(config);
  },
};

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}), // secrets passed per-sign/verify call
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, googleStrategyProvider],
  exports: [AuthService],
})
export class AuthModule {}
