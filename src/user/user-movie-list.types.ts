import type { Movie, PaginatedResponse } from '../movies/movie.types.js';
import type { MovieSearchOptions } from '../movies/movie.types.js';

export type UserMovieListType = 'watchlist' | 'favorites';

export interface UserMovieListResult {
  list: UserMovieListType;
  movieId: number;
  added: boolean;
}

export interface UserMovieListRemovalResult {
  list: UserMovieListType;
  movieId: number;
  removed: boolean;
}

export interface UserMovieListResponse extends PaginatedResponse<Movie> {
  list: UserMovieListType;
}

export interface UserMovieListQuery {
  listType: UserMovieListType;
  options?: Partial<MovieSearchOptions>;
}
