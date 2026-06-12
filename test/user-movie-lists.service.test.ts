import test from 'node:test';
import assert from 'node:assert/strict';
import { UserMovieListsService } from '../src/user/user-movie-lists.service.js';
import type { Movie } from '../src/movies/movie.types.js';
import type { UserMovieListType } from '../src/user/user-movie-list.types.js';
import type { UserMovieListsRepository } from '../src/user/user-movie-lists.repository.js';

const movie: Movie = {
  id: 10,
  title: 'Saved Movie',
  originalTitle: 'Saved Movie',
  overview: 'Saved.',
  releaseDate: '2026-06-01',
  posterPath: '/poster.jpg',
  backdropPath: '/backdrop.jpg',
  originalLanguage: 'en',
  status: 'Released',
  runtimeMinutes: 90,
  budget: 100,
  revenue: 200,
  tagline: null,
  homepage: null,
  imdbId: 'tt0000010',
  popularity: 12,
  tmdbRatingAverage: 7.2,
  tmdbRatingCount: 10,
  usersRatingAverage: 8.5,
  userRatingCount: 2,
  myRating: 9,
  syncedAt: '2026-06-11T12:00:00.000Z',
  genres: ['Drama'],
  isFavorite: false,
  isInWatchlist: true,
};

void test('list returns the requested user movie list', async () => {
  const repository = new FakeUserMovieListsRepository();
  const service = new UserMovieListsService(
    repository as unknown as UserMovieListsRepository,
  );

  const result = await service.list(7, {
    listType: 'watchlist',
    options: {
      search: '  saved  ',
      filter: 'rated_by_me',
      year: 2026,
      genreId: 18,
      limit: 500,
      offset: 3,
    },
  });

  assert.deepEqual(repository.lastListCall, {
    userId: 7,
    listType: 'watchlist',
    options: {
      search: 'saved',
      filter: 'rated_by_me',
      year: 2026,
      genreId: 18,
      limit: 100,
      offset: 3,
    },
  });
  assert.deepEqual(result, { list: 'watchlist', movies: [movie] });
});

void test('add returns idempotent add result', async () => {
  const repository = new FakeUserMovieListsRepository();
  const service = new UserMovieListsService(
    repository as unknown as UserMovieListsRepository,
  );

  const result = await service.add(7, 10, 'favorites');

  assert.deepEqual(repository.lastAddCall, {
    userId: 7,
    movieId: 10,
    listType: 'favorites',
  });
  assert.deepEqual(result, { list: 'favorites', movieId: 10, added: true });
});

void test('remove returns idempotent removal result', async () => {
  const repository = new FakeUserMovieListsRepository();
  const service = new UserMovieListsService(
    repository as unknown as UserMovieListsRepository,
  );

  const result = await service.remove(7, 10, 'watchlist');

  assert.deepEqual(repository.lastRemoveCall, {
    userId: 7,
    movieId: 10,
    listType: 'watchlist',
  });
  assert.deepEqual(result, { list: 'watchlist', movieId: 10, removed: true });
});

class FakeUserMovieListsRepository {
  lastListCall?: {
    userId: number;
    listType: UserMovieListType;
    options: {
      search?: string;
      filter: string;
      year?: number;
      genreId?: number;
      limit: number;
      offset: number;
    };
  };
  lastAddCall?: {
    userId: number;
    movieId: number;
    listType: UserMovieListType;
  };
  lastRemoveCall?: {
    userId: number;
    movieId: number;
    listType: UserMovieListType;
  };

  list(
    userId: number,
    listType: UserMovieListType,
    options: {
      search?: string;
      filter: string;
      year?: number;
      genreId?: number;
      limit: number;
      offset: number;
    },
  ): Promise<Movie[]> {
    this.lastListCall = { userId, listType, options };
    return Promise.resolve([movie]);
  }

  add(
    userId: number,
    movieId: number,
    listType: UserMovieListType,
  ): Promise<boolean> {
    this.lastAddCall = { userId, movieId, listType };
    return Promise.resolve(true);
  }

  remove(
    userId: number,
    movieId: number,
    listType: UserMovieListType,
  ): Promise<boolean> {
    this.lastRemoveCall = { userId, movieId, listType };
    return Promise.resolve(true);
  }
}
