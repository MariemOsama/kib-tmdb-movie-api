/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from './auth.types.js';

interface AccessTokenPayload {
  sub: number;
  email: string;
}

export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60;

@Injectable()
export class TokenService {
  readonly expiresInSeconds = ACCESS_TOKEN_EXPIRES_IN_SECONDS;

  constructor(private readonly jwtService: JwtService) {}

  sign(user: AuthenticatedUser): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
      },
      { expiresIn: this.expiresInSeconds },
    );
  }

  verify(token: string): AuthenticatedUser {
    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);
      return { id: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('Invalid or expired bearer token');
    }
  }
}
