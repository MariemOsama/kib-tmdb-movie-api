import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  UserMovieListQuery,
  UserMovieListResponse,
  UserMovieListType,
} from '../src/user/user-movie-list.types.js';
import type { UserMovieListsService } from '../src/user/user-movie-lists.service.js';
import { UserController } from '../src/user/user.controller.js';
import type { Movie } from '../src/movies/movie.types.js';

const user = { id: 7, email: 'mariem@example.com' };

const ratedMovie: Movie = {
  id: 10,
  title: 'Rated Movie',
  originalTitle: 'Rated Movie',
  overview: 'A movie with ratings.',
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
  isInWatchlist: true,
};

void test('watchlist endpoints delegate with current user id', async () => {
  const service = new FakeUserMovieListsService();
  const controller = new UserController(
    service as unknown as UserMovieListsService,
  );

  const response = await controller.watchlist(
    user,
    'obsession',
    '15',
    'released',
    '2026',
    '28',
    '30',
  );
  await controller.addToWatchlist(user, 10);
  await controller.removeFromWatchlist(user, 10);

  assert.deepEqual(response, { list: 'watchlist', movies: [ratedMovie] });
  assert.equal(response.movies[0]?.usersRatingAverage, 8.25);
  assert.equal(response.movies[0]?.userRatingCount, 4);
  assert.equal(response.movies[0]?.myRating, 9);
  assert.deepEqual(service.calls, [
    {
      action: 'list',
      userId: 7,
      listType: 'watchlist',
      options: {
        search: 'obsession',
        filter: 'released',
        year: 2026,
        genreId: 28,
        limit: 15,
        offset: 30,
      },
    },
    { action: 'add', userId: 7, movieId: 10, listType: 'watchlist' },
    { action: 'remove', userId: 7, movieId: 10, listType: 'watchlist' },
  ]);
});

void test('favorites endpoints delegate with current user id', async () => {
  const service = new FakeUserMovieListsService();
  const controller = new UserController(
    service as unknown as UserMovieListsService,
  );

  const response = await controller.favorites(
    user,
    'obsession',
    '10',
    'rated_by_me',
    '2026',
    '27',
    '20',
  );
  await controller.addToFavorites(user, 10);
  await controller.removeFromFavorites(user, 10);

  assert.deepEqual(response, { list: 'favorites', movies: [ratedMovie] });
  assert.equal(response.movies[0]?.usersRatingAverage, 8.25);
  assert.equal(response.movies[0]?.userRatingCount, 4);
  assert.equal(response.movies[0]?.myRating, 9);
  assert.deepEqual(service.calls, [
    {
      action: 'list',
      userId: 7,
      listType: 'favorites',
      options: {
        search: 'obsession',
        filter: 'rated_by_me',
        year: 2026,
        genreId: 27,
        limit: 10,
        offset: 20,
      },
    },
    { action: 'add', userId: 7, movieId: 10, listType: 'favorites' },
    { action: 'remove', userId: 7, movieId: 10, listType: 'favorites' },
  ]);
});

type ServiceCall =
  | {
      action: 'list';
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
    }
  | {
      action: 'add';
      userId: number;
      movieId: number;
      listType: UserMovieListType;
    }
  | {
      action: 'remove';
      userId: number;
      movieId: number;
      listType: UserMovieListType;
    };

class FakeUserMovieListsService {
  calls: ServiceCall[] = [];

  list(
    userId: number,
    query: UserMovieListQuery,
  ): Promise<UserMovieListResponse> {
    const options = query.options as {
      search?: string;
      filter: string;
      year?: number;
      genreId?: number;
      limit: number;
      offset: number;
    };
    const listType = query.listType;
    this.calls.push({ action: 'list', userId, listType, options });
    return Promise.resolve({ list: listType, movies: [ratedMovie] });
  }

  add(
    userId: number,
    movieId: number,
    listType: UserMovieListType,
  ): Promise<{
    list: UserMovieListType;
    movieId: number;
    added: boolean;
  }> {
    this.calls.push({ action: 'add', userId, movieId, listType });
    return Promise.resolve({ list: listType, movieId, added: true });
  }

  remove(
    userId: number,
    movieId: number,
    listType: UserMovieListType,
  ): Promise<{
    list: UserMovieListType;
    movieId: number;
    removed: boolean;
  }> {
    this.calls.push({ action: 'remove', userId, movieId, listType });
    return Promise.resolve({ list: listType, movieId, removed: true });
  }
}
