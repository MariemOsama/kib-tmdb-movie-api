import { Injectable } from '@nestjs/common';
import {
  UserMovieListRemovalResult,
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
    listType: UserMovieListType,
  ): Promise<UserMovieListResponse> {
    const movies = await this.userMovieListsRepository.list(userId, listType);

    return { list: listType, movies };
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
