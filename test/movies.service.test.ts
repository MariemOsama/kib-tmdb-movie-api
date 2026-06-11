import test from 'node:test';
import assert from 'node:assert/strict';
import { MoviesService } from '../src/movies/movies.service.js';
import type { ConfigService } from '@nestjs/config';
import type { MoviesRepository } from '../src/movies/movies.repository.js';
import type { TmdbClient } from '../src/movies/tmdb.client.js';
import type {
  Genre,
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
  );

  const result = await service.syncPopularMovies(99, 'refresh');

  assert.equal(repository.requestedSync?.pageCount, 15);
  assert.equal(repository.requestedSync?.mode, 'refresh');
  assert.deepEqual(result.pages, [20, 21]);
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
