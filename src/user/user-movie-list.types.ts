import type { Movie } from '../movies/movie.types.js';

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

export interface UserMovieListResponse {
  list: UserMovieListType;
  movies: Movie[];
}
