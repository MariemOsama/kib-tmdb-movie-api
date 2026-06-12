import test from 'node:test';
import assert from 'node:assert/strict';
import { MoviesController } from '../src/movies/movies.controller.js';
import type {
  Movie,
  MovieRatingResult,
  SyncMode,
} from '../src/movies/movie.types.js';
import type { MoviesService } from '../src/movies/movies.service.js';

const user = { id: 7, email: 'mariem@example.com' };

const movie: Movie = {
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
  isInWatchlist: false,
};

void test('movie detail and rating endpoints delegate with current user id', async () => {
  const service = new FakeMoviesService();
  const controller = new MoviesController(service as unknown as MoviesService);

  const details = await controller.details(user, 10);
  const rating = await controller.rate(user, 10, { rating: 9 });

  assert.deepEqual(details, movie);
  assert.deepEqual(rating, {
    movieId: 10,
    rating: 9,
    usersRatingAverage: 8.25,
    userRatingCount: 4,
  });
  assert.deepEqual(service.calls, [
    { action: 'details', userId: 7, movieId: 10 },
    { action: 'rate', userId: 7, movieId: 10, rating: 9 },
  ]);
});

void test('movie list endpoint delegates search query parameters', async () => {
  const service = new FakeMoviesService();
  const controller = new MoviesController(service as unknown as MoviesService);

  const result = await controller.list(
    user,
    'obsession',
    '15',
    'released',
    '2026',
    '27',
    '30',
  );

  assert.deepEqual(result, [movie]);
  assert.deepEqual(service.calls, [
    {
      action: 'list',
      userId: 7,
      options: {
        search: 'obsession',
        filter: 'released',
        year: 2026,
        genreId: 27,
        limit: 15,
        offset: 30,
      },
    },
  ]);
});

type ServiceCall =
  | {
      action: 'list';
      userId: number;
      options: {
        search?: string;
        filter: string;
        year?: number;
        genreId?: number;
        limit: number;
        offset: number;
      };
    }
  | { action: 'details'; userId: number; movieId: number }
  | { action: 'rate'; userId: number; movieId: number; rating: unknown };

class FakeMoviesService {
  calls: ServiceCall[] = [];

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
    this.calls.push({ action: 'list', userId, options });
    return Promise.resolve([movie]);
  }

  listGenres(): Promise<[]> {
    return Promise.resolve([]);
  }

  syncPopularMovies(): Promise<{
    mode: SyncMode;
    pages: number[];
    synced: number;
  }> {
    return Promise.resolve({ mode: 'next', pages: [], synced: 0 });
  }

  details(userId: number, movieId: number): Promise<Movie> {
    this.calls.push({ action: 'details', userId, movieId });
    return Promise.resolve(movie);
  }

  rateMovie(
    userId: number,
    movieId: number,
    rating: unknown,
  ): Promise<MovieRatingResult> {
    this.calls.push({ action: 'rate', userId, movieId, rating });
    return Promise.resolve({
      movieId,
      rating: Number(rating),
      usersRatingAverage: 8.25,
      userRatingCount: 4,
    });
  }
}
