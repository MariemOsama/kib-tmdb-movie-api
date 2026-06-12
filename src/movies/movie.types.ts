export interface Movie {
  id: number;
  title: string;
  originalTitle: string | null;
  overview: string;
  releaseDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  originalLanguage: string | null;
  status: string | null;
  runtimeMinutes: number | null;
  budget: number | null;
  revenue: number | null;
  tagline: string | null;
  homepage: string | null;
  imdbId: string | null;
  popularity: number;
  tmdbRatingAverage: number;
  tmdbRatingCount: number;
  usersRatingAverage: number | null;
  userRatingCount: number;
  myRating: number | null;
  syncedAt: string | null;
  genres: string[];
  isFavorite: boolean;
  isInWatchlist: boolean;
}

export interface PaginationMetadata {
  limit: number;
  offset: number;
  count: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export type MovieListResponse = PaginatedResponse<Movie>;

export interface MovieRatingResult {
  movieId: number;
  rating: number;
  usersRatingAverage: number;
  userRatingCount: number;
}

export interface RateMovieRequest {
  rating: number;
}

export const MOVIE_FILTERS = [
  'all',
  'released',
  'upcoming',
  'highly_rated',
  'rated_by_me',
] as const;

export type MovieFilter = (typeof MOVIE_FILTERS)[number];

export interface MovieSearchOptions {
  search?: string;
  filter: MovieFilter;
  year?: number;
  genreId?: number;
  limit: number;
  offset: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface TmdbMovie {
  id: number;
  title: string;
  originalTitle: string | null;
  overview: string;
  releaseDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  originalLanguage: string | null;
  status: string | null;
  runtimeMinutes: number | null;
  budget: number | null;
  revenue: number | null;
  tagline: string | null;
  homepage: string | null;
  imdbId: string | null;
  popularity: number;
  tmdbRatingAverage: number;
  tmdbRatingCount: number;
  genreIds: number[];
}

export interface TmdbMoviePage {
  page: number;
  totalPages: number;
  movies: TmdbMovie[];
}

export type SyncMode = 'next' | 'refresh';
