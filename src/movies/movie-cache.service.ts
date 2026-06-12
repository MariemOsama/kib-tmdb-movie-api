import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const MOVIE_CACHE_VERSION_KEY = 'movies:version';
const USER_CACHE_VERSION_PREFIX = 'users:version:';
const MOVIE_CACHE_TTL_SECONDS = 60;
const GENRE_CACHE_TTL_SECONDS = 300;
const DEFAULT_CACHE_VERSION = 1;

@Injectable()
export class MovieCacheService {
  private readonly pendingReads = new Map<string, Promise<unknown>>();

  constructor(private readonly redis: RedisService) {}

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cachedValue = await this.redis.getJson<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const pendingRead = this.pendingReads.get(key) as Promise<T> | undefined;
    if (pendingRead) {
      return pendingRead;
    }

    const read = loader().then(async (value) => {
      await this.redis.setJson(key, value, ttlSeconds);
      return value;
    });
    this.pendingReads.set(key, read);

    try {
      return await read;
    } finally {
      this.pendingReads.delete(key);
    }
  }

  async movieListKey(userId: number, options: unknown): Promise<string> {
    return this.userAwareKey('movies:list', userId, options);
  }

  async movieDetailsKey(userId: number, movieId: number): Promise<string> {
    return this.userAwareKey('movies:details', userId, movieId);
  }

  async userMovieListKey(
    userId: number,
    listType: string,
    options: unknown,
  ): Promise<string> {
    return this.userAwareKey(`users:movie-list:${listType}`, userId, options);
  }

  async genreListKey(): Promise<string> {
    const movieVersion = await this.movieVersion();
    return `movies:genres:v${movieVersion}`;
  }

  async invalidateMovieCatalog(): Promise<void> {
    await this.redis.increment(MOVIE_CACHE_VERSION_KEY);
  }

  async invalidateUser(userId: number): Promise<void> {
    await this.redis.increment(`${USER_CACHE_VERSION_PREFIX}${userId}`);
  }

  movieTtlSeconds(): number {
    return MOVIE_CACHE_TTL_SECONDS;
  }

  genreTtlSeconds(): number {
    return GENRE_CACHE_TTL_SECONDS;
  }

  private async userAwareKey(
    prefix: string,
    userId: number,
    payload: unknown,
  ): Promise<string> {
    const [movieVersion, userVersion] = await Promise.all([
      this.movieVersion(),
      this.userVersion(userId),
    ]);
    return `${prefix}:mv${movieVersion}:uv${userVersion}:u${userId}:${stableStringify(payload)}`;
  }

  private movieVersion(): Promise<number> {
    return this.redis.getNumber(MOVIE_CACHE_VERSION_KEY, DEFAULT_CACHE_VERSION);
  }

  private userVersion(userId: number): Promise<number> {
    return this.redis.getNumber(
      `${USER_CACHE_VERSION_PREFIX}${userId}`,
      DEFAULT_CACHE_VERSION,
    );
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]),
    );
  }

  return value;
}
