import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfilePayload {
  googleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

/**
 * Google OAuth2 strategy. Only registered when GOOGLE_CLIENT_ID is configured
 * (see AuthModule). Returns a normalised profile that AuthService turns into a
 * session.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('google.clientId') || 'unset',
      clientSecret: config.get<string>('google.clientSecret') || 'unset',
      callbackURL:
        config.get<string>('google.callbackUrl') ||
        'http://localhost:4000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const payload: GoogleProfilePayload = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, payload);
  }
}
