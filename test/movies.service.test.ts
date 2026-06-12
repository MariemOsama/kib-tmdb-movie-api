import test from 'node:test';
import assert from 'node:assert/strict';
import { MoviesService } from '../src/movies/movies.service.js';
import type { ConfigService } from '@nestjs/config';
import type { MovieCacheService } from '../src/movies/movie-cache.service.js';
import type { MoviesRepository } from '../src/movies/movies.repository.js';
import type { TmdbClient } from '../src/movies/tmdb.client.js';
import type {
  Genre,
  Movie,
  MovieRatingResult,
  SyncMode,
  TmdbMovie,
  TmdbMoviePage,
} from '../src/movies/movie.types.js';

const genres: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 53, name: 'Thriller' },
];

const movieOne: TmdbMovie = {
  id: 1,
  title: 'First Movie',
  originalTitle: 'First Movie',
  overview: 'Overview',
  releaseDate: '2026-01-01',
  posterPath: '/poster-one.jpg',
  backdropPath: '/backdrop-one.jpg',
  originalLanguage: 'en',
  status: 'Released',
  runtimeMinutes: 100,
  budget: 1000,
  revenue: 2000,
  tagline: 'One',
  homepage: null,
  imdbId: 'tt0000001',
  popularity: 10,
  tmdbRatingAverage: 7.5,
  tmdbRatingCount: 50,
  genreIds: [28],
};

const movieTwo: TmdbMovie = {
  ...movieOne,
  id: 2,
  title: 'Second Movie',
  originalTitle: 'Second Movie',
  posterPath: '/poster-two.jpg',
  backdropPath: '/backdrop-two.jpg',
  imdbId: 'tt0000002',
  genreIds: [53],
};

const storedMovie: Movie = {
  id: 1,
  title: 'First Movie',
  originalTitle: 'First Movie',
  overview: 'Overview',
  releaseDate: '2026-01-01',
  posterPath: '/poster-one.jpg',
  backdropPath: '/backdrop-one.jpg',
  originalLanguage: 'en',
  status: 'Released',
  runtimeMinutes: 100,
  budget: 1000,
  revenue: 2000,
  tagline: 'One',
  homepage: null,
  imdbId: 'tt0000001',
  popularity: 10,
  tmdbRatingAverage: 7.5,
  tmdbRatingCount: 50,
  usersRatingAverage: 8.5,
  userRatingCount: 2,
  myRating: 9,
  syncedAt: '2026-06-11T12:00:00.000Z',
  genres: ['Action'],
  isFavorite: true,
  isInWatchlist: false,
};

void test('syncPopularMovies syncs genres, requested pages, deduped movies, and completes state', async () => {
  const repository = new FakeMoviesRepository([1, 2, 3]);
  const tmdbClient = new FakeTmdbClient([
    { page: 1, totalPages: 100, movies: [movieOne] },
    { page: 2, totalPages: 100, movies: [movieOne, movieTwo] },
    { page: 3, totalPages: 100, movies: [movieTwo] },
  ]);
  const service = new MoviesService(
    repository as unknown as MoviesRepository,
    tmdbClient as unknown as TmdbClient,
    new FakeConfigService() as unknown as ConfigService,
    new FakeMovieCacheService() as unknown as MovieCacheService,
  );

  const result = await service.syncPopularMovies(3, 'next');

  assert.deepEqual(repository.upsertedGenres, genres);
  assert.deepEqual(repository.requestedSync, {
    source: 'tmdb_popular_movies',
    pageCount: 3,
    mode: 'next',
  });
  assert.deepEqual(tmdbClient.requestedPages, [1, 2, 3]);
  assert.deepEqual(repository.upsertedMovieIds, [1, 2]);
  assert.deepEqual(repository.completedSync, {
    source: 'tmdb_popular_movies',
    syncedPages: [1, 2, 3],
    totalPages: 100,
    mode: 'next',
  });
  assert.deepEqual(result, {
    mode: 'next',
    pages: [1, 2, 3],
    synced: 2,
  });
});

void test('syncPopularMovies clamps page count and passes refresh mode', async () => {
  const repository = new FakeMoviesRepository([20, 21]);
  const tmdbClient = new FakeTmdbClient([
    { page: 20, totalPages: 100, movies: [movieOne] },
    { page: 21, totalPages: 100, movies: [movieTwo] },
  ]);
  const service = new MoviesService(
    repository as unknown as MoviesRepository,
    tmdbClient as unknown as TmdbClient,
    new FakeConfigService() as unknown as ConfigService,
    new FakeMovieCacheService() as unknown as MovieCacheService,
  );

  const result = await service.syncPopularMovies(99, 'refresh');

  assert.equal(repository.requestedSync?.pageCount, 15);
  assert.equal(repository.requestedSync?.mode, 'refresh');
  assert.deepEqual(result.pages, [20, 21]);
});

void test('list normalizes search, limit, and offset before querying', async () => {
  const repository = new FakeMoviesRepository([]);
  const service = new MoviesService(
    repository as unknown as MoviesRepository,
    new FakeTmdbClient([]) as unknown as TmdbClient,
    new FakeConfigService() as unknown as ConfigService,
    new FakeMovieCacheService() as unknown as MovieCacheService,
  );

  const result = await service.list(7, {
    search: '  obsession  ',
    filter: 'highly_rated',
    year: 2026,
    genreId: 27,
    limit: 500,
    offset: 10,
  });

  assert.deepEqual(result, [storedMovie]);
  assert.deepEqual(repository.lastListCall, {
    userId: 7,
    options: {
      search: 'obsession',
      filter: 'highly_rated',
      year: 2026,
      genreId: 27,
      limit: 100,
      offset: 10,
    },
  });
});

void test('details returns a movie for the current user', async () => {
  const repository = new FakeMoviesRepository([]);
  const service = new MoviesService(
    repository as unknown as MoviesRepository,
    new FakeTmdbClient([]) as unknown as TmdbClient,
    new FakeConfigService() as unknown as ConfigService,
    new FakeMovieCacheService() as unknown as MovieCacheService,
  );

  const result = await service.details(7, 1);

  assert.deepEqual(repository.lastFindByIdCall, { userId: 7, movieId: 1 });
  assert.deepEqual(result, storedMovie);
});

void test('rateMovie validates and stores a whole-number user rating', async () => {
  const repository = new FakeMoviesRepository([]);
  const service = new MoviesService(
    repository as unknown as MoviesRepository,
    new FakeTmdbClient([]) as unknown as TmdbClient,
    new FakeConfigService() as unknown as ConfigService,
    new FakeMovieCacheService() as unknown as MovieCacheService,
  );

  const result = await service.rateMovie(7, 1, 9);

  assert.deepEqual(repository.lastRateCall, {
    userId: 7,
    movieId: 1,
    rating: 9,
  });
  assert.deepEqual(result, {
    movieId: 1,
    rating: 9,
    usersRatingAverage: 9,
    userRatingCount: 1,
  });
});

void test('rateMovie rejects ratings outside 1 through 10', async () => {
  const repository = new FakeMoviesRepository([]);
  const service = new MoviesService(
    repository as unknown as MoviesRepository,
    new FakeTmdbClient([]) as unknown as TmdbClient,
    new FakeConfigService() as unknown as ConfigService,
    new FakeMovieCacheService() as unknown as MovieCacheService,
  );

  await assert.rejects(
    service.rateMovie(7, 1, 11),
    /Rating must be an integer between 1 and 10/,
  );
  assert.equal(repository.lastRateCall, undefined);
});

class FakeMoviesRepository {
  upsertedGenres: Genre[] = [];
  upsertedMovieIds: number[] = [];
  requestedSync?: { source: string; pageCount: number; mode: SyncMode };
  completedSync?: {
    source: string;
    syncedPages: number[];
    totalPages: number;
    mode: SyncMode;
  };
  lastListCall?: {
    userId: number;
    options: {
      search?: string;
      filter: string;
      year?: number;
      genreId?: number;
      limit: number;
      offset: number;
    };
  };
  lastFindByIdCall?: { userId: number; movieId: number };
  lastRateCall?: { userId: number; movieId: number; rating: number };
  listCallCount = 0;

  constructor(private readonly pagesToSync: number[]) {}

  getSyncPages(
    source: string,
    pageCount: number,
    mode: SyncMode,
  ): Promise<number[]> {
    this.requestedSync = { source, pageCount, mode };
    return Promise.resolve(this.pagesToSync);
  }

  upsertGenres(receivedGenres: Genre[]): Promise<number> {
    this.upsertedGenres = receivedGenres;
    return Promise.resolve(receivedGenres.length);
  }

  upsertMany(movies: TmdbMovie[]): Promise<number> {
    this.upsertedMovieIds = movies.map((movie) => movie.id);
    return Promise.resolve(movies.length);
  }

  completeSync(
    source: string,
    syncedPages: number[],
    totalPages: number,
    mode: SyncMode,
  ): Promise<void> {
    this.completedSync = { source, syncedPages, totalPages, mode };
    return Promise.resolve();
  }

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
  ): Promise<Movie[]> {
    this.listCallCount += 1;
    this.lastListCall = { userId, options };
    return Promise.resolve([storedMovie]);
  }

  findById(userId: number, movieId: number): Promise<Movie | null> {
    this.lastFindByIdCall = { userId, movieId };
    return Promise.resolve(storedMovie);
  }

  rate(
    userId: number,
    movieId: number,
    rating: number,
  ): Promise<MovieRatingResult> {
    this.lastRateCall = { userId, movieId, rating };
    return Promise.resolve({
      movieId,
      rating,
      usersRatingAverage: rating,
      userRatingCount: 1,
    });
  }
}

class FakeTmdbClient {
  requestedPages: number[] = [];

  constructor(private readonly pages: TmdbMoviePage[]) {}

  fetchMovieGenres(): Promise<Genre[]> {
    return Promise.resolve(genres);
  }

  fetchPopularMovies(page: number): Promise<TmdbMoviePage> {
    this.requestedPages.push(page);
    const result = this.pages.find((candidate) => candidate.page === page);
    assert.ok(result, `Unexpected page requested: ${page}`);
    return Promise.resolve(result);
  }
}

class FakeConfigService {
  get(): string | undefined {
    return undefined;
  }
}

class FakeMovieCacheService {
  private readonly values = new Map<string, unknown>();
  invalidatedMovieCatalog = 0;
  invalidatedUsers: number[] = [];

  getOrSet<T>(
    key: string,
    _ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (this.values.has(key)) {
      return Promise.resolve(this.values.get(key) as T);
    }

    return loader().then((value) => {
      this.values.set(key, value);
      return value;
    });
  }

  movieListKey(userId: number, options: unknown): Promise<string> {
    return Promise.resolve(`movies:list:${userId}:${JSON.stringify(options)}`);
  }

  movieDetailsKey(userId: number, movieId: number): Promise<string> {
    return Promise.resolve(`movies:details:${userId}:${movieId}`);
  }

  genreListKey(): Promise<string> {
    return Promise.resolve('movies:genres');
  }

  invalidateMovieCatalog(): Promise<void> {
    this.invalidatedMovieCatalog += 1;
    this.values.clear();
    return Promise.resolve();
  }

  invalidateUser(userId: number): Promise<void> {
    this.invalidatedUsers.push(userId);
    this.values.clear();
    return Promise.resolve();
  }

  movieTtlSeconds(): number {
    return 60;
  }

  genreTtlSeconds(): number {
    return 300;
  }
}
