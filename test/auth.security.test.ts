import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../src/auth/auth.guard.js';
import { PasswordService } from '../src/auth/password.service.js';
import { TokenService } from '../src/auth/token.service.js';
import type { AuthenticatedUser } from '../src/auth/auth.types.js';
import type { ExecutionContext } from '@nestjs/common';

interface TestRequest {
  headers: Record<string, string | undefined>;
  user?: AuthenticatedUser;
}

void test('password service hashes and verifies passwords', async () => {
  const passwordService = new PasswordService();

  const passwordHash = await passwordService.hash('strong-password');

  assert.notEqual(passwordHash, 'strong-password');
  assert.equal(
    await passwordService.verify('strong-password', passwordHash),
    true,
  );
  assert.equal(
    await passwordService.verify('wrong-password', passwordHash),
    false,
  );
});

void test('token service signs and verifies authenticated users', () => {
  const tokenService = createTokenService();

  const token = tokenService.sign({ id: 7, email: 'mariem@example.com' });

  assert.deepEqual(tokenService.verify(token), {
    id: 7,
    email: 'mariem@example.com',
  });
});

void test('auth guard accepts bearer tokens', () => {
  const tokenService = createTokenService();
  const guard = new AuthGuard(
    tokenService,
    new ConfigService({ JWT_SECRET: 'test-secret' }),
  );
  const token = tokenService.sign({ id: 7, email: 'mariem@example.com' });
  const request: TestRequest = {
    headers: { authorization: `Bearer ${token}` },
  };

  assert.equal(guard.canActivate(createContext(request)), true);
  assert.deepEqual(request.user, { id: 7, email: 'mariem@example.com' });
});

void test('auth guard accepts configured internal sync token', () => {
  const guard = new AuthGuard(
    createTokenService(),
    new ConfigService({ INTERNAL_SYNC_TOKEN: 'sync-token' }),
  );
  const request: TestRequest = {
    headers: { 'x-internal-sync-token': 'sync-token' },
  };

  assert.equal(guard.canActivate(createContext(request)), true);
});

void test('auth guard accepts internal sync token as bearer fallback', () => {
  const guard = new AuthGuard(
    createTokenService(),
    new ConfigService({ INTERNAL_SYNC_TOKEN: 'sync-token' }),
  );
  const request: TestRequest = {
    headers: { authorization: 'Bearer sync-token' },
  };

  assert.equal(guard.canActivate(createContext(request)), true);
});

void test('auth guard rejects missing credentials', () => {
  const guard = new AuthGuard(createTokenService(), new ConfigService());

  assert.throws(
    () => guard.canActivate(createContext({ headers: {} })),
    UnauthorizedException,
  );
});

function createTokenService(): TokenService {
  return new TokenService(
    new JwtService({
      secret: 'test-secret',
      signOptions: {
        expiresIn: '1h',
      },
    }),
  );
}

function createContext(request: TestRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
