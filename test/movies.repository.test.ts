import test from 'node:test';
import assert from 'node:assert/strict';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import type { DatabaseService } from '../src/database/database.service.js';
import { MoviesRepository } from '../src/movies/movies.repository.js';

void test('list maps database records into movie catalog objects', async () => {
  const database = new FakeDatabase([
    {
      rows: [
        {
          id: '10',
          title: 'Mapped Movie',
          original_title: 'Mapped Movie Original',
          overview: 'A mapped row.',
          release_date: '2026-06-01',
          poster_path: '/poster.jpg',
          backdrop_path: '/backdrop.jpg',
          original_language: 'en',
          status: 'Released',
          runtime_minutes: 98,
          budget: '1500000',
          revenue: '3200000',
          tagline: 'Mapped.',
          homepage: 'https://example.com',
          imdb_id: 'tt1234567',
          popularity: '12.5000',
          tmdb_rating_average: '7.80',
          tmdb_rating_count: 120,
          synced_at: '2026-06-11T12:00:00.000Z',
          genres: ['Action', 'Thriller'],
          is_favorite: true,
          is_in_watchlist: false,
        },
      ],
    },
  ]);
  const repository = new MoviesRepository(
    database as unknown as DatabaseService,
  );

  const result = await repository.list(7);

  assert.deepEqual(database.calls[0]?.params, [7]);

  assert.deepEqual(result, [
    {
      id: 10,
      title: 'Mapped Movie',
      originalTitle: 'Mapped Movie Original',
      overview: 'A mapped row.',
      releaseDate: '2026-06-01',
      posterPath: '/poster.jpg',
      backdropPath: '/backdrop.jpg',
      originalLanguage: 'en',
      status: 'Released',
      runtimeMinutes: 98,
      budget: 1500000,
      revenue: 3200000,
      tagline: 'Mapped.',
      homepage: 'https://example.com',
      imdbId: 'tt1234567',
      popularity: 12.5,
      tmdbRatingAverage: 7.8,
      tmdbRatingCount: 120,
      syncedAt: '2026-06-11T12:00:00.000Z',
      genres: ['Action', 'Thriller'],
      isFavorite: true,
      isInWatchlist: false,
    },
  ]);
});

void test('getSyncPages returns next pages with wrap-around', async () => {
  const database = new FakeDatabase([
    { rows: [] },
    {
      rows: [
        {
          next_page: 98,
          refresh_next_page: 1,
          total_pages: 100,
          last_start_page: 70,
          last_page_count: 5,
        },
      ],
    },
  ]);
  const repository = new MoviesRepository(
    database as unknown as DatabaseService,
  );

  const result = await repository.getSyncPages(
    'tmdb_popular_movies',
    5,
    'next',
  );

  assert.deepEqual(result, [98, 99, 100, 1, 2]);
});

void test('getSyncPages refreshes the next bounded refresh batch', async () => {
  const database = new FakeDatabase([
    { rows: [] },
    {
      rows: [
        {
          next_page: 31,
          refresh_next_page: 1,
          total_pages: 100,
          last_start_page: 16,
          last_page_count: 15,
        },
      ],
    },
  ]);
  const repository = new MoviesRepository(
    database as unknown as DatabaseService,
  );

  const result = await repository.getSyncPages(
    'tmdb_popular_movies',
    5,
    'refresh',
  );

  assert.deepEqual(result, [1, 2, 3, 4, 5]);
});

void test('completeSync stores cursor and last synced batch metadata', async () => {
  const database = new FakeDatabase([{ rows: [] }]);
  const repository = new MoviesRepository(
    database as unknown as DatabaseService,
  );

  await repository.completeSync(
    'tmdb_popular_movies',
    [98, 99, 100],
    100,
    'next',
  );

  assert.deepEqual(database.calls[0]?.params, [
    'tmdb_popular_movies',
    1,
    100,
    98,
    3,
  ]);
});

void test('completeSync advances refresh cursor without changing ingest cursor', async () => {
  const database = new FakeDatabase([
    {
      rows: [
        {
          next_page: 31,
          total_pages: 100,
        },
      ],
    },
    { rows: [] },
  ]);
  const repository = new MoviesRepository(
    database as unknown as DatabaseService,
  );

  await repository.completeSync(
    'tmdb_popular_movies',
    [1, 2, 3, 4, 5],
    100,
    'refresh',
  );

  assert.deepEqual(database.calls[1]?.params, [
    'tmdb_popular_movies',
    6,
    100,
    1,
    5,
  ]);
});

class FakeDatabase {
  calls: Array<{ text: string; params: unknown[] }> = [];
  private responseIndex = 0;

  constructor(private readonly responses: Array<{ rows: QueryResultRow[] }>) {}

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    this.calls.push({ text, params });
    const response = this.responses[this.responseIndex] ?? { rows: [] };
    this.responseIndex += 1;
    return Promise.resolve({
      rows: response.rows as T[],
      command: '',
      rowCount: response.rows.length,
      oid: 0,
      fields: [],
    });
  }

  transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return callback({ query: this.query.bind(this) } as unknown as PoolClient);
  }
}
