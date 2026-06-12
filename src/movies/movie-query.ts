import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import {
  MOVIE_FILTERS,
  type MovieFilter,
  type MovieSearchOptions,
} from './movie.types.js';

const DEFAULT_MOVIE_QUERY_LIMIT = 20;
const MAX_MOVIE_QUERY_LIMIT = 100;

export const MOVIE_QUERY_FILTER_SQL = `
  AND (
    $2::text IS NULL
    OR m.title ILIKE $2 ESCAPE '\\'
    OR m.original_title ILIKE $2 ESCAPE '\\'
  )
  AND (
    $5::text = 'all'
    OR ($5::text = 'released' AND m.release_date IS NOT NULL AND m.release_date <= CURRENT_DATE)
    OR ($5::text = 'upcoming' AND m.release_date IS NOT NULL AND m.release_date > CURRENT_DATE)
    OR ($5::text = 'highly_rated' AND m.tmdb_rating_average >= 7)
    OR (
      $5::text = 'rated_by_me'
      AND EXISTS (
        SELECT 1
        FROM user_movie_ratings umr
        WHERE umr.user_id = $1 AND umr.movie_id = m.id
      )
    )
  )
  AND ($6::int IS NULL OR EXTRACT(YEAR FROM m.release_date)::int = $6)
  AND (
    $7::int IS NULL
    OR EXISTS (
      SELECT 1
      FROM movie_genres filter_mg
      WHERE filter_mg.movie_id = m.id AND filter_mg.genre_id = $7
    )
  )
`;

export const MOVIE_QUERY_RELEVANCE_ORDER_SQL = `
  CASE
    WHEN $2::text IS NULL THEN 0
    WHEN m.title ILIKE trim(both '%' from $2) ESCAPE '\\' THEN 0
    WHEN m.original_title ILIKE trim(both '%' from $2) ESCAPE '\\' THEN 1
    WHEN m.title ILIKE concat(trim(both '%' from $2), '%') ESCAPE '\\' THEN 2
    WHEN m.original_title ILIKE concat(trim(both '%' from $2), '%') ESCAPE '\\' THEN 3
    ELSE 4
  END
`;

export function normalizeMovieSearchOptions(
  options: Partial<MovieSearchOptions>,
): MovieSearchOptions {
  const search = options.search?.trim();
  const limit = normalizeNonNegativeInteger(
    options.limit,
    DEFAULT_MOVIE_QUERY_LIMIT,
  );
  const offset = normalizeNonNegativeInteger(options.offset, 0);

  return {
    search: search ? search.slice(0, 120) : undefined,
    filter: normalizeMovieFilter(options.filter),
    year: normalizeYear(options.year),
    genreId: normalizePositiveInteger(options.genreId),
    limit: Math.min(Math.max(limit, 1), MAX_MOVIE_QUERY_LIMIT),
    offset,
  };
}

export function buildMovieSearchOptionsFromQuery(
  search: string | undefined,
  limit: string,
  filter: MovieFilter,
  year: string | undefined,
  genreId: string | undefined,
  offset: string,
): Partial<MovieSearchOptions> {
  return {
    search,
    filter,
    year: year === undefined ? undefined : Number(year),
    genreId: genreId === undefined ? undefined : Number(genreId),
    limit: Number(limit),
    offset: Number(offset),
  };
}

export function buildMovieQueryParams(
  userId: number,
  options: MovieSearchOptions,
): unknown[] {
  const search = options.search
    ? `%${escapeLikePattern(options.search)}%`
    : null;
  return [
    userId,
    search,
    options.limit,
    options.offset,
    options.filter,
    options.year ?? null,
    options.genreId ?? null,
  ];
}

export function ApiMovieQueryDocs(): MethodDecorator {
  return applyDecorators(
    ApiQuery({
      name: 'search',
      required: false,
      example: 'obsession',
      description:
        'Optional case-insensitive search term matched against movie title and original title.',
    }),
    ApiQuery({
      name: 'filter',
      required: false,
      enum: MOVIE_FILTERS,
      example: 'all',
      description:
        'Optional enum filter. all: no filter. released: release date is today or in the past. upcoming: release date is in the future. highly_rated: TMDB average rating is at least 7. rated_by_me: movies rated by the authenticated user.',
    }),
    ApiQuery({
      name: 'year',
      required: false,
      example: 2026,
      description: 'Optional release year filter based on movie releaseDate.',
    }),
    ApiQuery({
      name: 'genreId',
      required: false,
      example: 27,
      description:
        'Optional TMDB genre id filter. Use GET /movies/genres to discover available genre ids.',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      example: 20,
      description:
        'Maximum number of movies to return. Defaults to 20 and is capped at 100.',
    }),
    ApiQuery({
      name: 'offset',
      required: false,
      example: 0,
      description:
        'Number of matching movies to skip for pagination. Defaults to 0.',
    }),
  );
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function normalizeMovieFilter(value: MovieFilter | undefined): MovieFilter {
  if (value && MOVIE_FILTERS.includes(value)) {
    return value;
  }

  return 'all';
}

function normalizeNonNegativeInteger(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined || !Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

function normalizePositiveInteger(
  value: number | undefined,
): number | undefined {
  if (value === undefined || !Number.isInteger(value) || value < 1) {
    return undefined;
  }

  return value;
}

function normalizeYear(value: number | undefined): number | undefined {
  if (
    value === undefined ||
    !Number.isInteger(value) ||
    value < 1878 ||
    value > 2200
  ) {
    return undefined;
  }

  return value;
}
