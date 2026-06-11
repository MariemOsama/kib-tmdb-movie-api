import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Genre, Movie, SyncMode } from './movie.types.js';
import { MoviesRepository } from './movies.repository.js';
import { TmdbClient } from './tmdb.client.js';

const DEFAULT_MAX_SYNC_PAGES = 15;
const ABSOLUTE_MAX_SYNC_PAGES = 100;

@Injectable()
export class MoviesService {
  constructor(
    private readonly moviesRepository: MoviesRepository,
    private readonly tmdbClient: TmdbClient,
    private readonly config: ConfigService,
  ) {}

  async list(): Promise<Movie[]> {
    return this.moviesRepository.list();
  }

  async listGenres(): Promise<Genre[]> {
    return this.moviesRepository.listGenres();
  }

  async syncPopularMovies(
    pages = 1,
    mode: SyncMode = 'next',
  ): Promise<{ mode: SyncMode; pages: number[]; synced: number }> {
    const pageCount = Math.max(
      1,
      Math.min(Number(pages), this.getMaxSyncPages()),
    );
    const genres = await this.tmdbClient.fetchMovieGenres();
    await this.moviesRepository.upsertGenres(genres);

    const pagesToSync = await this.moviesRepository.getSyncPages(
      'tmdb_popular_movies',
      pageCount,
      mode,
    );
    if (!pagesToSync.length) {
      return { mode, pages: [], synced: 0 };
    }

    const batches = await Promise.all(
      pagesToSync.map((page) => this.tmdbClient.fetchPopularMovies(page)),
    );
    const moviesById = new Map(
      batches
        .flatMap((batch) => batch.movies)
        .map((movie) => [movie.id, movie]),
    );
    const synced = await this.moviesRepository.upsertMany([
      ...moviesById.values(),
    ]);
    await this.moviesRepository.completeSync(
      'tmdb_popular_movies',
      batches.map((batch) => batch.page),
      Math.min(...batches.map((batch) => batch.totalPages)),
      mode,
    );

    return { mode, pages: batches.map((batch) => batch.page), synced };
  }

  private getMaxSyncPages(): number {
    const configuredValue = Number(
      this.config.get<string>('TMDB_SYNC_MAX_PAGES') ?? DEFAULT_MAX_SYNC_PAGES,
    );
    if (!Number.isInteger(configuredValue) || configuredValue < 1) {
      return DEFAULT_MAX_SYNC_PAGES;
    }

    return Math.min(configuredValue, ABSOLUTE_MAX_SYNC_PAGES);
  }
}
