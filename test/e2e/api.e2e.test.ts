import 'reflect-metadata';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Module, UnauthorizedException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppController } from '../../src/app.controller.js';
import { AuthController } from '../../src/auth/auth.controller.js';
import { AuthGuard } from '../../src/auth/auth.guard.js';
import { AuthService } from '../../src/auth/auth.service.js';
import type { AuthResult, RegisterRequest } from '../../src/auth/auth.types.js';
import { TokenService } from '../../src/auth/token.service.js';
import { MoviesController } from '../../src/movies/movies.controller.js';
import type {
  Genre,
  Movie,
  MovieListResponse,
  MovieRatingResult,
  SyncMode,
} from '../../src/movies/movie.types.js';
import { MoviesService } from '../../src/movies/movies.service.js';

Reflect.defineMetadata('design:paramtypes', [AuthService], AuthController);
Reflect.defineMetadata('design:paramtypes', [MoviesService], MoviesController);
Reflect.defineMetadata(
  'design:paramtypes',
  [TokenService, ConfigService],
  AuthGuard,
);

const e2eUser = { id: 7, email: 'mariem@example.com' };
const e2eMovie: Movie = {
  id: 10,
  title: 'E2E Movie',
  originalTitle: 'E2E Movie',
  overview: 'A movie returned through the HTTP layer.',
  releaseDate: '2026-06-01',
  posterPath: '/poster.jpg',
  backdropPath: '/backdrop.jpg',
  originalLanguage: 'en',
  status: 'Released',
  runtimeMinutes: 101,
  budget: 1000000,
  revenue: 2500000,
  tagline: null,
  homepage: null,
  imdbId: 'tt1234567',
  popularity: 50.12,
  tmdbRatingAverage: 7.8,
  tmdbRatingCount: 120,
  usersRatingAverage: 8.25,
  userRatingCount: 4,
  myRating: 9,
  syncedAt: '2026-06-11T12:00:00.000Z',
  genres: ['Action', 'Thriller'],
  isFavorite: true,
  isInWatchlist: false,
};

interface WelcomeResponse {
  name: string;
  status: string;
  docs: string;
  health: string;
  ready: string;
}

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}

let app: INestApplication;
let baseUrl: string;

before(async () => {
  app = await NestFactory.create(E2eTestModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  baseUrl = getBaseUrl(app.getHttpServer() as Server);
});

after(async () => {
  await app.close();
});

void test('GET / returns the public welcome payload', async () => {
  const response = await fetch(`${baseUrl}/`);
  const body = await readJson<WelcomeResponse>(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    name: 'KIB TMDB Movie API',
    status: 'running',
    docs: '/docs',
    health: '/health',
    ready: '/ready',
  });
});

void test('POST /auth/register returns an access token through the HTTP layer', async () => {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'Mariem@Example.com',
      password: 'strong-password',
    }),
  });
  const body = await readJson<AuthResult>(response);

  assert.equal(response.status, 201);
  assert.equal(body.accessToken, 'valid-token');
  assert.equal(body.tokenType, 'Bearer');
  assert.deepEqual(body.user, e2eUser);
});

void test('GET /movies rejects requests without a bearer token', async () => {
  const response = await fetch(`${baseUrl}/movies`);
  const body = await readJson<ErrorResponse>(response);

  assert.equal(response.status, 401);
  assert.equal(body.message, 'Bearer token is required');
});

void test('GET /movies accepts a bearer token and returns the paginated wrapper', async () => {
  const response = await fetch(
    `${baseUrl}/movies?search=e2e&limit=20&offset=0`,
    {
      headers: { authorization: 'Bearer valid-token' },
    },
  );
  const body = await readJson<MovieListResponse>(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    data: [e2eMovie],
    pagination: {
      limit: 20,
      offset: 0,
      count: 1,
      hasMore: false,
    },
  });
});

function getBaseUrl(server: Server): string {
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, 'string');

  const port = (address as AddressInfo).port;
  return `http://127.0.0.1:${port}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

class FakeAuthService {
  register(request: RegisterRequest): Promise<AuthResult> {
    assert.equal(request.email, 'Mariem@Example.com');
    return Promise.resolve(buildAuthResult());
  }

  login(): Promise<AuthResult> {
    return Promise.resolve(buildAuthResult());
  }
}

class FakeTokenService {
  verify(token: string): typeof e2eUser {
    if (token !== 'valid-token') {
      throw new UnauthorizedException('Invalid bearer token');
    }

    return e2eUser;
  }
}

class FakeConfigService {
  get(): string | undefined {
    return undefined;
  }
}

class FakeMoviesService {
  list(
    userId: number,
    options: {
      search?: string;
      filter: string;
      year?: number;
      genreId?: number;
      limit: number;
      offset: number;
    },
  ): Promise<MovieListResponse> {
    assert.equal(userId, e2eUser.id);
    assert.equal(options.search, 'e2e');
    assert.equal(options.filter, 'all');
    assert.equal(options.limit, 20);
    assert.equal(options.offset, 0);

    return Promise.resolve({
      data: [e2eMovie],
      pagination: {
        limit: options.limit,
        offset: options.offset,
        count: 1,
        hasMore: false,
      },
    });
  }

  listGenres(): Promise<Genre[]> {
    return Promise.resolve([{ id: 28, name: 'Action' }]);
  }

  syncPopularMovies(): Promise<{
    mode: SyncMode;
    pages: number[];
    synced: number;
  }> {
    return Promise.resolve({ mode: 'next', pages: [], synced: 0 });
  }

  details(_userId: number, movieId: number): Promise<Movie> {
    return Promise.resolve({ ...e2eMovie, id: movieId });
  }

  rateMovie(
    _userId: number,
    movieId: number,
    rating: unknown,
  ): Promise<MovieRatingResult> {
    return Promise.resolve({
      movieId,
      rating: Number(rating),
      usersRatingAverage: Number(rating),
      userRatingCount: 1,
    });
  }
}

@Module({
  controllers: [AppController, AuthController, MoviesController],
  providers: [
    AuthGuard,
    { provide: AuthService, useClass: FakeAuthService },
    { provide: MoviesService, useClass: FakeMoviesService },
    { provide: TokenService, useClass: FakeTokenService },
    { provide: ConfigService, useClass: FakeConfigService },
  ],
})
class E2eTestModule {}

function buildAuthResult(): AuthResult {
  return {
    accessToken: 'valid-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: e2eUser,
  };
}
