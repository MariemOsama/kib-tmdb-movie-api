import test from 'node:test';
import assert from 'node:assert/strict';
import { CurrentUserController } from '../src/user/current-user.controller.js';
import type { UserMovieListType } from '../src/user/user-movie-list.types.js';
import type { UserMovieListsService } from '../src/user/user-movie-lists.service.js';

const user = { id: 7, email: 'mariem@example.com' };

void test('watchlist endpoints delegate with current user id', async () => {
  const service = new FakeUserMovieListsService();
  const controller = new CurrentUserController(
    service as unknown as UserMovieListsService,
  );

  await controller.watchlist(user);
  await controller.addToWatchlist(user, 10);
  await controller.removeFromWatchlist(user, 10);

  assert.deepEqual(service.calls, [
    { action: 'list', userId: 7, listType: 'watchlist' },
    { action: 'add', userId: 7, movieId: 10, listType: 'watchlist' },
    { action: 'remove', userId: 7, movieId: 10, listType: 'watchlist' },
  ]);
});

void test('favorites endpoints delegate with current user id', async () => {
  const service = new FakeUserMovieListsService();
  const controller = new CurrentUserController(
    service as unknown as UserMovieListsService,
  );

  await controller.favorites(user);
  await controller.addToFavorites(user, 10);
  await controller.removeFromFavorites(user, 10);

  assert.deepEqual(service.calls, [
    { action: 'list', userId: 7, listType: 'favorites' },
    { action: 'add', userId: 7, movieId: 10, listType: 'favorites' },
    { action: 'remove', userId: 7, movieId: 10, listType: 'favorites' },
  ]);
});

type ServiceCall =
  | { action: 'list'; userId: number; listType: UserMovieListType }
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
    listType: UserMovieListType,
  ): Promise<{ list: UserMovieListType; movies: [] }> {
    this.calls.push({ action: 'list', userId, listType });
    return Promise.resolve({ list: listType, movies: [] });
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
