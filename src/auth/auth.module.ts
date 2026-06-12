import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { ACCESS_TOKEN_EXPIRES_IN_SECONDS } from './token.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [
    DatabaseModule,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthGuard,
    AuthRepository,
    AuthService,
    PasswordService,
    TokenService,
  ],
  exports: [AuthGuard, TokenService],
})
export class AuthModule {}
