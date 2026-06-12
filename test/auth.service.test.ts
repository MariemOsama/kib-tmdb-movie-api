import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service.js';
import type { AuthRepository } from '../src/auth/auth.repository.js';
import type { UserAccount } from '../src/auth/auth.types.js';
import type { PasswordService } from '../src/auth/password.service.js';
import type { TokenService } from '../src/auth/token.service.js';

void test('register normalizes email, hashes password, stores user, and returns token', async () => {
  const repository = new FakeAuthRepository();
  const passwordService = new FakePasswordService();
  const tokenService = new FakeTokenService();
  const service = new AuthService(
    repository as unknown as AuthRepository,
    passwordService as unknown as PasswordService,
    tokenService as unknown as TokenService,
  );

  const result = await service.register({
    email: ' Mariem@Example.COM ',
    password: 'strong-password',
  });

  assert.equal(repository.createdUser?.email, 'mariem@example.com');
  assert.equal(repository.createdUser?.passwordHash, 'hashed:strong-password');
  assert.deepEqual(result, {
    accessToken: 'token-for-1',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: { id: 1, email: 'mariem@example.com' },
  });
});

void test('register rejects an existing email', async () => {
  const repository = new FakeAuthRepository();
  repository.users.set('mariem@example.com', buildUser('mariem@example.com'));
  const service = new AuthService(
    repository as unknown as AuthRepository,
    new FakePasswordService() as unknown as PasswordService,
    new FakeTokenService() as unknown as TokenService,
  );

  await assert.rejects(
    service.register({
      email: 'mariem@example.com',
      password: 'strong-password',
    }),
    ConflictException,
  );
});

void test('login rejects invalid credentials', async () => {
  const repository = new FakeAuthRepository();
  repository.users.set('mariem@example.com', buildUser('mariem@example.com'));
  const service = new AuthService(
    repository as unknown as AuthRepository,
    new FakePasswordService() as unknown as PasswordService,
    new FakeTokenService() as unknown as TokenService,
  );

  await assert.rejects(
    service.login({ email: 'mariem@example.com', password: 'wrong-password' }),
    UnauthorizedException,
  );
});

void test('login rejects a missing user with not found', async () => {
  const service = new AuthService(
    new FakeAuthRepository() as unknown as AuthRepository,
    new FakePasswordService() as unknown as PasswordService,
    new FakeTokenService() as unknown as TokenService,
  );

  await assert.rejects(
    service.login({
      email: 'missing@example.com',
      password: 'strong-password',
    }),
    NotFoundException,
  );
});

void test('login rejects malformed email before repository lookup', async () => {
  const repository = new FakeAuthRepository();
  const service = new AuthService(
    repository as unknown as AuthRepository,
    new FakePasswordService() as unknown as PasswordService,
    new FakeTokenService() as unknown as TokenService,
  );

  await assert.rejects(
    service.login({ email: 'missing-email', password: 'strong-password' }),
    BadRequestException,
  );
  assert.equal(repository.findByEmailCalls, 0);
});

class FakeAuthRepository {
  users = new Map<string, UserAccount>();
  createdUser?: { email: string; passwordHash: string };
  findByEmailCalls = 0;

  findByEmail(email: string): Promise<UserAccount | null> {
    this.findByEmailCalls += 1;
    return Promise.resolve(this.users.get(email) ?? null);
  }

  createUser(email: string, passwordHash: string): Promise<UserAccount> {
    this.createdUser = { email, passwordHash };
    const user = buildUser(email, passwordHash);
    this.users.set(email, user);
    return Promise.resolve(user);
  }
}

class FakePasswordService {
  hash(password: string): Promise<string> {
    return Promise.resolve(`hashed:${password}`);
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return Promise.resolve(passwordHash === `hashed:${password}`);
  }
}

class FakeTokenService {
  readonly expiresInSeconds = 3600;

  sign(user: { id: number; email: string }): string {
    return `token-for-${user.id}`;
  }
}

function buildUser(
  email: string,
  passwordHash = 'hashed:strong-password',
): UserAccount {
  return {
    id: 1,
    email,
    passwordHash,
    createdAt: '2026-06-11T12:00:00.000Z',
    updatedAt: '2026-06-11T12:00:00.000Z',
  };
}
