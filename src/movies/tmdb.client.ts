import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Genre, TmdbMovie, TmdbMoviePage } from './movie.types.js';

interface TmdbPopularResponse {
  page: number;
  total_pages: number;
  results: Array<{
    id: number;
    title: string;
    overview?: string;
    original_title?: string;
    release_date?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    original_language?: string;
    popularity?: number;
    vote_average?: number;
    vote_count?: number;
    genre_ids?: number[];
  }>;
}

interface TmdbGenresResponse {
  genres: Genre[];
}

interface TmdbMovieDetailsResponse {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  original_language?: string;
  status?: string;
  runtime?: number | null;
  budget?: number;
  revenue?: number;
  tagline?: string;
  homepage?: string;
  imdb_id?: string | null;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id: number; name: string }>;
}

@Injectable()
export class TmdbClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('TMDB_API_KEY') ?? '';
    this.baseUrl =
      config.get<string>('TMDB_BASE_URL') ?? 'https://api.themoviedb.org/3';
  }

  async fetchMovieGenres(): Promise<Genre[]> {
    this.ensureConfigured();

    const url = new URL(`${this.baseUrl}/genre/movie/list`);
    url.searchParams.set('api_key', this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `TMDB genre request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as TmdbGenresResponse;
    return payload.genres;
  }

  async fetchPopularMovies(page: number): Promise<TmdbMoviePage> {
    this.ensureConfigured();

    const payload = await this.fetchPopularMoviePage(page);
    const popularMovies = payload.results.map((movie) => ({
      id: movie.id,
      title: movie.title,
      originalTitle: movie.original_title ?? movie.title,
      overview: movie.overview ?? '',
      releaseDate: movie.release_date || null,
      posterPath: movie.poster_path ?? null,
      backdropPath: movie.backdrop_path ?? null,
      originalLanguage: movie.original_language ?? null,
      status: null,
      runtimeMinutes: null,
      budget: null,
      revenue: null,
      tagline: null,
      homepage: null,
      imdbId: null,
      popularity: movie.popularity ?? 0,
      tmdbRatingAverage: movie.vote_average ?? 0,
      tmdbRatingCount: movie.vote_count ?? 0,
      genreIds: movie.genre_ids ?? [],
    }));

    return {
      page: payload.page,
      totalPages: payload.total_pages,
      movies: await Promise.all(
        popularMovies.map((movie) => this.fetchMovieDetails(movie)),
      ),
    };
  }

  private ensureConfigured(): void {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('TMDB_API_KEY is not configured');
    }
  }

  private async fetchPopularMoviePage(
    page: number,
  ): Promise<TmdbPopularResponse> {
    const url = new URL(`${this.baseUrl}/movie/popular`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('page', String(page));

    const response = await fetch(url);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `TMDB request failed with status ${response.status}`,
      );
    }

    return (await response.json()) as TmdbPopularResponse;
  }

  private async fetchMovieDetails(movie: TmdbMovie): Promise<TmdbMovie> {
    const url = new URL(`${this.baseUrl}/movie/${movie.id}`);
    url.searchParams.set('api_key', this.apiKey);

    const response = await fetch(url);
    if (!response.ok) return movie;

    const details = (await response.json()) as TmdbMovieDetailsResponse;

    return {
      id: details.id,
      title: details.title,
      originalTitle: details.original_title ?? movie.originalTitle,
      overview: details.overview ?? movie.overview,
      releaseDate: details.release_date || movie.releaseDate,
      posterPath: details.poster_path ?? movie.posterPath,
      backdropPath: details.backdrop_path ?? movie.backdropPath,
      originalLanguage: details.original_language ?? movie.originalLanguage,
      status: details.status ?? movie.status,
      runtimeMinutes: details.runtime ?? movie.runtimeMinutes,
      budget: details.budget ?? movie.budget,
      revenue: details.revenue ?? movie.revenue,
      tagline: details.tagline ?? movie.tagline,
      homepage: details.homepage ?? movie.homepage,
      imdbId: details.imdb_id ?? movie.imdbId,
      popularity: details.popularity ?? movie.popularity,
      tmdbRatingAverage: details.vote_average ?? movie.tmdbRatingAverage,
      tmdbRatingCount: details.vote_count ?? movie.tmdbRatingCount,
      genreIds: details.genres?.map((genre) => genre.id) ?? movie.genreIds,
    };
  }
}
