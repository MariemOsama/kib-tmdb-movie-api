import { Injectable } from '@nestjs/common';
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
  ) {}

  async list(
    userId: number,
    query: UserMovieListQuery,
  ): Promise<UserMovieListResponse> {
    const movies = await this.userMovieListsRepository.list(
      userId,
      query.listType,
      normalizeMovieSearchOptions(query.options ?? {}),
    );

    return { list: query.listType, movies };
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

    return { list: listType, movieId, removed };
  }
}
