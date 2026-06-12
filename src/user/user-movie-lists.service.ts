import { Injectable } from '@nestjs/common';
import { MovieCacheService } from '../movies/movie-cache.service.js';
import { normalizeMovieSearchOptions } from '../movies/movie-query.js';
import {
  UserMovieListRemovalResult,
  UserMovieListQuery,
  UserMovieListResponse,
  UserMovieListResult,
  UserMovieListType,
} from './user-movie-list.types.js';
import { UserMovieListsRepository } from './user-movie-lists.repository.js';

@Injectable()
export class UserMovieListsService {
  constructor(
    private readonly userMovieListsRepository: UserMovieListsRepository,
    private readonly cache: MovieCacheService,
  ) {}

  async list(
    userId: number,
    query: UserMovieListQuery,
  ): Promise<UserMovieListResponse> {
    const options = normalizeMovieSearchOptions(query.options ?? {});
    const key = await this.cache.userMovieListKey(
      userId,
      query.listType,
      options,
    );

    return this.cache.getOrSet(key, this.cache.movieTtlSeconds(), async () => {
      const movies = await this.userMovieListsRepository.list(
        userId,
        query.listType,
        options,
      );
      return { list: query.listType, movies };
    });
  }

  async add(
    userId: number,
    movieId: number,
    listType: UserMovieListType,
  ): Promise<UserMovieListResult> {
    const added = await this.userMovieListsRepository.add(
      userId,
      movieId,
      listType,
    );
    await this.cache.invalidateUser(userId);

    return { list: listType, movieId, added };
  }

  async remove(
    userId: number,
    movieId: number,
    listType: UserMovieListType,
  ): Promise<UserMovieListRemovalResult> {
    const removed = await this.userMovieListsRepository.remove(
      userId,
      movieId,
      listType,
    );
    await this.cache.invalidateUser(userId);

    return { list: listType, movieId, removed };
  }
}
