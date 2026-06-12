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
          user_rating_average: '8.25',
          user_rating_count: 4,
          my_rating: 9,
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
      usersRatingAverage: 8.25,
      userRatingCount: 4,
      myRating: 9,
      syncedAt: '2026-06-11T12:00:00.000Z',
      genres: ['Action', 'Thriller'],
      isFavorite: true,
      isInWatchlist: false,
    },
  ]);
});

void test('findById maps movie details with user rating metadata', async () => {
  const database = new FakeDatabase([
    {
      rows: [
        {
          id: '10',
          title: 'Detailed Movie',
          original_title: null,
          overview: 'Details.',
          release_date: null,
          poster_path: null,
          backdrop_path: null,
          original_language: 'en',
          status: 'Released',
          runtime_minutes: null,
          budget: null,
          revenue: null,
          tagline: null,
          homepage: null,
          imdb_id: null,
          popularity: '5.0000',
          tmdb_rating_average: '6.50',
          tmdb_rating_count: 20,
          user_rating_average: null,
          user_rating_count: 0,
          my_rating: null,
          synced_at: null,
          genres: [],
          is_favorite: false,
          is_in_watchlist: true,
        },
      ],
    },
  ]);
  const repository = new MoviesRepository(
    database as unknown as DatabaseService,
  );

  const result = await repository.findById(7, 10);

  assert.deepEqual(database.calls[0]?.params, [7, 10]);
  assert.equal(result?.id, 10);
  assert.equal(result?.usersRatingAverage, null);
  assert.equal(result?.userRatingCount, 0);
  assert.equal(result?.myRating, null);
  assert.equal(result?.isInWatchlist, true);
});

void test("rate upserts a user's movie rating and returns the updated aggregate", async () => {
  const database = new FakeDatabase([
    { rows: [{ id: '10' }] },
    { rows: [], rowCount: 1 },
    { rows: [{ user_rating_average: '8.50', user_rating_count: 2 }] },
  ]);
  const repository = new MoviesRepository(
    database as unknown as DatabaseService,
  );

  const result = await repository.rate(7, 10, 9);

  assert.match(database.calls[1]?.text ?? '', /INSERT INTO user_movie_ratings/);
  assert.deepEqual(database.calls[1]?.params, [7, 10, 9]);
  assert.deepEqual(result, {
    movieId: 10,
    rating: 9,
    usersRatingAverage: 8.5,
    userRatingCount: 2,
  });
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

  constructor(
    private readonly responses: Array<{
      rows: QueryResultRow[];
      rowCount?: number;
    }>,
  ) {}

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
      rowCount: response.rowCount ?? response.rows.length,
      oid: 0,
      fields: [],
    });
  }

  transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return callback({ query: this.query.bind(this) } as unknown as PoolClient);
  }
}
