import test from 'node:test';
import assert from 'node:assert/strict';
import { MovieCacheService } from '../src/movies/movie-cache.service.js';
import type { RedisService } from '../src/redis/redis.service.js';

void test('movie cache coalesces concurrent identical reads into one loader call', async () => {
  const cache = new MovieCacheService(
    new FakeRedisService() as unknown as RedisService,
  );
  let loaderCalls = 0;

  const results = await Promise.all(
    Array.from({ length: 25 }, () =>
      cache.getOrSet('movies:list:perf', 60, async () => {
        loaderCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return [{ id: 1, title: 'Cached Movie' }];
      }),
    ),
  );

  assert.equal(loaderCalls, 1);
  assert.equal(results.length, 25);
  assert.deepEqual(results[0], [{ id: 1, title: 'Cached Movie' }]);
});

void test('movie cache version keys change after invalidation', async () => {
  const redis = new FakeRedisService();
  const cache = new MovieCacheService(redis as unknown as RedisService);

  const before = await cache.movieListKey(7, {
    search: 'obsession',
    filter: 'all',
    limit: 20,
    offset: 0,
  });
  await cache.invalidateMovieCatalog();
  const after = await cache.movieListKey(7, {
    search: 'obsession',
    filter: 'all',
    limit: 20,
    offset: 0,
  });

  assert.notEqual(before, after);
});

class FakeRedisService {
  private readonly values = new Map<string, unknown>();
  private readonly numbers = new Map<string, number>();

  getJson<T>(key: string): Promise<T | null> {
    return Promise.resolve((this.values.get(key) as T | undefined) ?? null);
  }

  setJson(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }

  getNumber(key: string, fallback: number): Promise<number> {
    return Promise.resolve(this.numbers.get(key) ?? fallback);
  }

  increment(key: string): Promise<void> {
    this.numbers.set(key, (this.numbers.get(key) ?? 1) + 1);
    return Promise.resolve();
  }
}
