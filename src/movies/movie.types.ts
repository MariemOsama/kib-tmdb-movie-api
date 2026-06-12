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

export interface MovieRatingResult {
  movieId: number;
  rating: number;
  usersRatingAverage: number;
  userRatingCount: number;
}

export interface RateMovieRequest {
  rating: number;
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
