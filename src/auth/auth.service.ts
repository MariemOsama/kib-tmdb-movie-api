import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository.js';
import { AuthResult, LoginRequest, RegisterRequest } from './auth.types.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async register(request: RegisterRequest): Promise<AuthResult> {
    const email = normalizeEmail(request.email);
    validateCredentials(email, request.password);

    const existingUser = await this.authRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email is already exist');
    }

    const passwordHash = await this.passwordService.hash(request.password);
    const user = await this.authRepository.createUser(email, passwordHash);

    return this.createAuthResult({ id: user.id, email: user.email });
  }

  async login(request: LoginRequest): Promise<AuthResult> {
    const email = normalizeEmail(request.email);
    validateEmail(email);
    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    const passwordMatches = await this.passwordService.verify(
      request.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createAuthResult({ id: user.id, email: user.email });
  }

  private createAuthResult(user: { id: number; email: string }): AuthResult {
    return {
      accessToken: this.tokenService.sign(user),
      tokenType: 'Bearer',
      expiresIn: this.tokenService.expiresInSeconds,
      user,
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: string): void {
  validateEmail(email);

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestException(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }
}

function validateEmail(email: string): void {
  if (!EMAIL_PATTERN.test(email)) {
    throw new BadRequestException('A valid email is required');
  }
}
