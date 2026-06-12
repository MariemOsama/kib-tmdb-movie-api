import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  Genre,
  Movie,
  MovieRatingResult,
  MovieSearchOptions,
  SyncMode,
  TmdbMovie,
} from './movie.types.js';
import {
  buildMovieQueryParams,
  MOVIE_QUERY_FILTER_SQL,
  MOVIE_QUERY_RELEVANCE_ORDER_SQL,
} from './movie-query.js';

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
  user_rating_average: string | null;
  user_rating_count: number;
  my_rating: number | null;
  synced_at: string | null;
  genres: string[] | null;
  is_favorite: boolean;
  is_in_watchlist: boolean;
}

interface MovieRatingSummaryRecord {
  user_rating_average: string;
  user_rating_count: number;
}

@Injectable()
export class MoviesRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(userId: number, options: MovieSearchOptions): Promise<Movie[]> {
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
        (
          SELECT ROUND(AVG(umr.rating)::numeric, 2)
          FROM user_movie_ratings umr
          WHERE umr.movie_id = m.id
        ) AS user_rating_average,
        (
          SELECT COUNT(*)::int
          FROM user_movie_ratings umr
          WHERE umr.movie_id = m.id
        ) AS user_rating_count,
        (
          SELECT umr.rating
          FROM user_movie_ratings umr
          WHERE umr.user_id = $1 AND umr.movie_id = m.id
        ) AS my_rating,
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
      FROM movies m
      LEFT JOIN movie_genres mg ON mg.movie_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE TRUE
      ${MOVIE_QUERY_FILTER_SQL}
      GROUP BY m.id
      ORDER BY
        ${MOVIE_QUERY_RELEVANCE_ORDER_SQL},
        m.popularity DESC,
        m.title ASC
      LIMIT $3
      OFFSET $4
    `,
      buildMovieQueryParams(userId, options),
    );

    return result.rows.map(mapMovieCatalogRecordToMovie);
  }

  async findById(userId: number, movieId: number): Promise<Movie | null> {
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
        (
          SELECT ROUND(AVG(umr.rating)::numeric, 2)
          FROM user_movie_ratings umr
          WHERE umr.movie_id = m.id
        ) AS user_rating_average,
        (
          SELECT COUNT(*)::int
          FROM user_movie_ratings umr
          WHERE umr.movie_id = m.id
        ) AS user_rating_count,
        (
          SELECT umr.rating
          FROM user_movie_ratings umr
          WHERE umr.user_id = $1 AND umr.movie_id = m.id
        ) AS my_rating,
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
      FROM movies m
      LEFT JOIN movie_genres mg ON mg.movie_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE m.id = $2
      GROUP BY m.id
    `,
      [userId, movieId],
    );

    const movie = result.rows[0];
    return movie ? mapMovieCatalogRecordToMovie(movie) : null;
  }

  async rate(
    userId: number,
    movieId: number,
    rating: number,
  ): Promise<MovieRatingResult> {
    await this.ensureMovieExists(movieId);
    await this.database.query(
      `
        INSERT INTO user_movie_ratings (user_id, movie_id, rating)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, movie_id) DO UPDATE SET
          rating = EXCLUDED.rating,
          updated_at = NOW()
      `,
      [userId, movieId, rating],
    );

    const summary = await this.database.query<MovieRatingSummaryRecord>(
      `
        SELECT
          COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS user_rating_average,
          COUNT(*)::int AS user_rating_count
        FROM user_movie_ratings
        WHERE movie_id = $1
      `,
      [movieId],
    );
    const row = summary.rows[0];

    return {
      movieId,
      rating,
      usersRatingAverage: row ? Number(row.user_rating_average) : rating,
      userRatingCount: row?.user_rating_count ?? 1,
    };
  }

  async listGenres(): Promise<Genre[]> {
    const result = await this.database.query<Genre>(`
      SELECT id, name
      FROM genres
      ORDER BY name ASC
    `);

    return result.rows;
  }

  async upsertGenres(genres: Genre[]): Promise<number> {
    await this.database.transaction(async (client) => {
      for (const genre of genres) {
        await client.query(
          `
            INSERT INTO genres (id, name, synced_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              synced_at = EXCLUDED.synced_at,
              updated_at = NOW()
          `,
          [genre.id, genre.name],
        );
      }
    });

    return genres.length;
  }

  async getSyncPages(
    source: string,
    pageCount: number,
    mode: SyncMode,
  ): Promise<number[]> {
    await this.database.query(
      `
        INSERT INTO sync_state (source, next_page)
        VALUES ($1, 1)
        ON CONFLICT (source) DO NOTHING
      `,
      [source],
    );

    const result = await this.database.query<{
      next_page: number;
      refresh_next_page: number;
      total_pages: number | null;
      last_start_page: number | null;
      last_page_count: number | null;
    }>(
      `
        SELECT next_page, refresh_next_page, total_pages, last_start_page, last_page_count
        FROM sync_state
        WHERE source = $1
      `,
      [source],
    );
    const state = result.rows[0];
    const totalPages = state.total_pages ?? 500;
    if (mode === 'refresh' && state.total_pages !== null) {
      const syncedPageCount =
        state.next_page === 1 ? totalPages : state.next_page - 1;
      if (syncedPageCount < 1) return [];

      const startPage =
        state.refresh_next_page > syncedPageCount ? 1 : state.refresh_next_page;
      const refreshPageCount = Math.min(pageCount, syncedPageCount);
      return buildPageRange(startPage, refreshPageCount, syncedPageCount);
    }

    return buildPageRange(state.next_page, pageCount, totalPages);
  }

  async completeSync(
    source: string,
    syncedPages: number[],
    totalPages: number,
    mode: SyncMode,
  ): Promise<void> {
    if (!syncedPages.length) return;
    const lastPage = syncedPages[syncedPages.length - 1];

    if (mode === 'refresh') {
      await this.completeRefreshSync(source, syncedPages, totalPages, lastPage);
      return;
    }

    const nextPage = lastPage >= totalPages ? 1 : lastPage + 1;

    await this.database.query(
      `
        INSERT INTO sync_state (
          source,
          next_page,
          total_pages,
          last_start_page,
          last_page_count,
          last_synced_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (source) DO UPDATE SET
          next_page = EXCLUDED.next_page,
          total_pages = EXCLUDED.total_pages,
          last_start_page = EXCLUDED.last_start_page,
          last_page_count = EXCLUDED.last_page_count,
          last_synced_at = EXCLUDED.last_synced_at,
          updated_at = NOW()
      `,
      [source, nextPage, totalPages, syncedPages[0], syncedPages.length],
    );
  }

  private async completeRefreshSync(
    source: string,
    syncedPages: number[],
    totalPages: number,
    lastPage: number,
  ): Promise<void> {
    const result = await this.database.query<{
      next_page: number;
      total_pages: number | null;
    }>(
      `
        SELECT next_page, total_pages
        FROM sync_state
        WHERE source = $1
      `,
      [source],
    );
    const state = result.rows[0];
    const effectiveTotalPages = state.total_pages ?? totalPages;
    const syncedPageCount =
      state.next_page === 1 ? effectiveTotalPages : state.next_page - 1;
    const refreshNextPage = lastPage >= syncedPageCount ? 1 : lastPage + 1;

    await this.database.query(
      `
        UPDATE sync_state
        SET
          refresh_next_page = $2,
          total_pages = $3,
          last_start_page = $4,
          last_page_count = $5,
          last_synced_at = NOW(),
          updated_at = NOW()
        WHERE source = $1
      `,
      [source, refreshNextPage, totalPages, syncedPages[0], syncedPages.length],
    );
  }

  async upsertMany(movies: TmdbMovie[]): Promise<number> {
    await this.database.transaction(async (client) => {
      for (const movie of movies) {
        await client.query(
          `
            INSERT INTO movies (
              id,
              title,
              original_title,
              overview,
              release_date,
              poster_path,
              backdrop_path,
              original_language,
              status,
              runtime_minutes,
              budget,
              revenue,
              tagline,
              homepage,
              imdb_id,
              popularity,
              tmdb_rating_average,
              tmdb_rating_count,
              synced_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              original_title = EXCLUDED.original_title,
              overview = EXCLUDED.overview,
              release_date = EXCLUDED.release_date,
              poster_path = EXCLUDED.poster_path,
              backdrop_path = EXCLUDED.backdrop_path,
              original_language = EXCLUDED.original_language,
              status = COALESCE(EXCLUDED.status, movies.status),
              runtime_minutes = COALESCE(EXCLUDED.runtime_minutes, movies.runtime_minutes),
              budget = COALESCE(EXCLUDED.budget, movies.budget),
              revenue = COALESCE(EXCLUDED.revenue, movies.revenue),
              tagline = COALESCE(EXCLUDED.tagline, movies.tagline),
              homepage = COALESCE(EXCLUDED.homepage, movies.homepage),
              imdb_id = COALESCE(EXCLUDED.imdb_id, movies.imdb_id),
              popularity = EXCLUDED.popularity,
              tmdb_rating_average = EXCLUDED.tmdb_rating_average,
              tmdb_rating_count = EXCLUDED.tmdb_rating_count,
              synced_at = EXCLUDED.synced_at,
              updated_at = NOW()
          `,
          [
            movie.id,
            movie.title,
            movie.originalTitle,
            movie.overview,
            movie.releaseDate,
            movie.posterPath,
            movie.backdropPath,
            movie.originalLanguage,
            movie.status,
            movie.runtimeMinutes,
            movie.budget,
            movie.revenue,
            movie.tagline,
            movie.homepage,
            movie.imdbId,
            movie.popularity,
            movie.tmdbRatingAverage,
            movie.tmdbRatingCount,
          ],
        );

        await client.query('DELETE FROM movie_genres WHERE movie_id = $1', [
          movie.id,
        ]);
        for (const genreId of movie.genreIds) {
          await client.query(
            `
              INSERT INTO movie_genres (movie_id, genre_id)
              SELECT $1, $2
              WHERE EXISTS (SELECT 1 FROM genres WHERE id = $2)
              ON CONFLICT DO NOTHING
            `,
            [movie.id, genreId],
          );
        }
      }
    });

    return movies.length;
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
    usersRatingAverage:
      row.user_rating_average === null ? null : Number(row.user_rating_average),
    userRatingCount: row.user_rating_count,
    myRating: row.my_rating,
    syncedAt: row.synced_at,
    genres: row.genres ?? [],
    isFavorite: row.is_favorite,
    isInWatchlist: row.is_in_watchlist,
  };
}

function buildPageRange(
  startPage: number,
  pageCount: number,
  totalPages: number,
): number[] {
  return Array.from({ length: pageCount }, (_, index) => {
    const page = startPage + index;
    return ((page - 1) % totalPages) + 1;
  });
}
