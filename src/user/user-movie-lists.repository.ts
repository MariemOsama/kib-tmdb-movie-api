import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { Movie } from '../movies/movie.types.js';
import { UserMovieListType } from './user-movie-list.types.js';

interface MovieCatalogRecord {
  id: string;
  title: string;
  original_title: string | null;
  overview: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string | null;
  status: string | null;
  runtime_minutes: number | null;
  budget: string | null;
  revenue: string | null;
  tagline: string | null;
  homepage: string | null;
  imdb_id: string | null;
  popularity: string;
  tmdb_rating_average: string;
  tmdb_rating_count: number;
  synced_at: string | null;
  genres: string[] | null;
  is_favorite: boolean;
  is_in_watchlist: boolean;
}

@Injectable()
export class UserMovieListsRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(userId: number, listType: UserMovieListType): Promise<Movie[]> {
    const tableName = getListTableName(listType);
    const result = await this.database.query<MovieCatalogRecord>(
      `
      SELECT
        m.id,
        m.title,
        m.original_title,
        m.overview,
        m.release_date,
        m.poster_path,
        m.backdrop_path,
        m.original_language,
        m.status,
        m.runtime_minutes,
        m.budget,
        m.revenue,
        m.tagline,
        m.homepage,
        m.imdb_id,
        m.popularity,
        m.tmdb_rating_average,
        m.tmdb_rating_count,
        m.synced_at,
        COALESCE(array_agg(g.name ORDER BY g.name) FILTER (WHERE g.id IS NOT NULL), '{}') AS genres,
        EXISTS (
          SELECT 1
          FROM user_favorites uf
          WHERE uf.user_id = $1 AND uf.movie_id = m.id
        ) AS is_favorite,
        EXISTS (
          SELECT 1
          FROM user_watchlist uw
          WHERE uw.user_id = $1 AND uw.movie_id = m.id
        ) AS is_in_watchlist
      FROM ${tableName} uml
      INNER JOIN movies m ON m.id = uml.movie_id
      LEFT JOIN movie_genres mg ON mg.movie_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE uml.user_id = $1
      GROUP BY m.id, uml.created_at
      ORDER BY uml.created_at DESC
    `,
      [userId],
    );

    return result.rows.map(mapMovieCatalogRecordToMovie);
  }

  async add(
    userId: number,
    movieId: number,
    listType: UserMovieListType,
  ): Promise<boolean> {
    await this.ensureMovieExists(movieId);
    const tableName = getListTableName(listType);
    const result = await this.database.query(
      `
        INSERT INTO ${tableName} (user_id, movie_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
      [userId, movieId],
    );

    return result.rowCount === 1;
  }

  async remove(
    userId: number,
    movieId: number,
    listType: UserMovieListType,
  ): Promise<boolean> {
    const tableName = getListTableName(listType);
    const result = await this.database.query(
      `
        DELETE FROM ${tableName}
        WHERE user_id = $1 AND movie_id = $2
      `,
      [userId, movieId],
    );

    return result.rowCount === 1;
  }

  private async ensureMovieExists(movieId: number): Promise<void> {
    const result = await this.database.query<{ id: string }>(
      `
        SELECT id
        FROM movies
        WHERE id = $1
      `,
      [movieId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException(`Movie ${movieId} was not found`);
    }
  }
}

function getListTableName(listType: UserMovieListType): string {
  return listType === 'watchlist' ? 'user_watchlist' : 'user_favorites';
}

function mapMovieCatalogRecordToMovie(row: MovieCatalogRecord): Movie {
  return {
    id: Number(row.id),
    title: row.title,
    originalTitle: row.original_title,
    overview: row.overview,
    releaseDate: row.release_date,
    posterPath: row.poster_path,
    backdropPath: row.backdrop_path,
    originalLanguage: row.original_language,
    status: row.status,
    runtimeMinutes: row.runtime_minutes,
    budget: row.budget === null ? null : Number(row.budget),
    revenue: row.revenue === null ? null : Number(row.revenue),
    tagline: row.tagline,
    homepage: row.homepage,
    imdbId: row.imdb_id,
    popularity: Number(row.popularity),
    tmdbRatingAverage: Number(row.tmdb_rating_average),
    tmdbRatingCount: row.tmdb_rating_count,
    syncedAt: row.synced_at,
    genres: row.genres ?? [],
    isFavorite: row.is_favorite,
    isInWatchlist: row.is_in_watchlist,
  };
}
