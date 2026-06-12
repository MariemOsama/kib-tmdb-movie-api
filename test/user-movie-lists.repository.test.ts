import test from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import type { DatabaseService } from '../src/database/database.service.js';
import { UserMovieListsRepository } from '../src/user/user-movie-lists.repository.js';

void test("list maps a user's watchlist movies", async () => {
  const database = new FakeDatabase([
    {
      rows: [
        {
          id: '10',
          title: 'Saved Movie',
          original_title: 'Saved Movie Original',
          overview: 'Saved.',
          release_date: '2026-06-01',
          poster_path: '/poster.jpg',
          backdrop_path: '/backdrop.jpg',
          original_language: 'en',
          status: 'Released',
          runtime_minutes: 98,
          budget: '1500000',
          revenue: '3200000',
          tagline: 'Saved.',
          homepage: null,
          imdb_id: 'tt1234567',
          popularity: '12.5000',
          tmdb_rating_average: '7.80',
          tmdb_rating_count: 120,
          synced_at: '2026-06-11T12:00:00.000Z',
          genres: ['Action'],
          is_favorite: true,
          is_in_watchlist: true,
        },
      ],
    },
  ]);
  const repository = new UserMovieListsRepository(
    database as unknown as DatabaseService,
  );

  const result = await repository.list(7, 'watchlist');

  assert.equal(database.calls[0]?.params[0], 7);
  assert.match(database.calls[0]?.text ?? '', /FROM user_watchlist uml/);
  assert.deepEqual(result[0], {
    id: 10,
    title: 'Saved Movie',
    originalTitle: 'Saved Movie Original',
    overview: 'Saved.',
    releaseDate: '2026-06-01',
    posterPath: '/poster.jpg',
    backdropPath: '/backdrop.jpg',
    originalLanguage: 'en',
    status: 'Released',
    runtimeMinutes: 98,
    budget: 1500000,
    revenue: 3200000,
    tagline: 'Saved.',
    homepage: null,
    imdbId: 'tt1234567',
    popularity: 12.5,
    tmdbRatingAverage: 7.8,
    tmdbRatingCount: 120,
    syncedAt: '2026-06-11T12:00:00.000Z',
    genres: ['Action'],
    isFavorite: true,
    isInWatchlist: true,
  });
});

void test('add validates movie existence and inserts into favorites', async () => {
  const database = new FakeDatabase([
    { rows: [{ id: '10' }] },
    { rows: [], rowCount: 1 },
  ]);
  const repository = new UserMovieListsRepository(
    database as unknown as DatabaseService,
  );

  const added = await repository.add(7, 10, 'favorites');

  assert.equal(added, true);
  assert.match(database.calls[1]?.text ?? '', /INSERT INTO user_favorites/);
  assert.deepEqual(database.calls[1]?.params, [7, 10]);
});

void test('add rejects a movie that does not exist', async () => {
  const database = new FakeDatabase([{ rows: [] }]);
  const repository = new UserMovieListsRepository(
    database as unknown as DatabaseService,
  );

  await assert.rejects(repository.add(7, 10, 'watchlist'), NotFoundException);
});

void test('remove deletes from the requested list', async () => {
  const database = new FakeDatabase([{ rows: [], rowCount: 1 }]);
  const repository = new UserMovieListsRepository(
    database as unknown as DatabaseService,
  );

  const removed = await repository.remove(7, 10, 'watchlist');

  assert.equal(removed, true);
  assert.match(database.calls[0]?.text ?? '', /DELETE FROM user_watchlist/);
  assert.deepEqual(database.calls[0]?.params, [7, 10]);
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
