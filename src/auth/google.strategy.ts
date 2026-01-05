import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
     clientID: process.env.GOOGLE_CLIENT_ID || '1081307796595-6v3n1j3n1j4q3n5k4f4j5k6l7m8n9o0p.apps.googleusercontent.com',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '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',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { emails, id } = profile;
    const user = await this.authService.validateGoogleUser(emails[0].value, id);
    done(null, user);
  }
}