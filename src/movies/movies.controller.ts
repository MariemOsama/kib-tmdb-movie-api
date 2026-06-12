import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { Genre, Movie, SyncMode } from './movie.types.js';
import { MoviesService } from './movies.service.js';

@ApiTags('movies')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ApiOperation({
    summary: 'List synced movies',
    description:
      'Returns the movie catalog currently stored in PostgreSQL, ordered by TMDB popularity and title. Each movie includes user-specific isFavorite and isInWatchlist flags for the authenticated user. The catalog is populated by the TMDB sync endpoint or the Docker sync job. Requires a bearer token from login/register.',
  })
  @ApiOkResponse({
    description: 'Movies stored in PostgreSQL.',
    schema: {
      example: [
        {
          id: 123,
          title: 'Example Movie',
          originalTitle: 'Example Movie',
          overview: 'Movie overview from TMDB.',
          releaseDate: '2026-06-01',
          posterPath: '/poster.jpg',
          backdropPath: '/backdrop.jpg',
          originalLanguage: 'en',
          status: 'Released',
          runtimeMinutes: 101,
          budget: 1000000,
          revenue: 2500000,
          tagline: 'An example tagline.',
          homepage: 'https://example.com',
          imdbId: 'tt1234567',
          popularity: 50.12,
          tmdbRatingAverage: 7.8,
          tmdbRatingCount: 120,
          syncedAt: '2026-06-11T12:00:00.000Z',
          genres: ['Action', 'Thriller'],
          isFavorite: true,
          isInWatchlist: false,
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing, invalid, or expired.',
  })
  list(@CurrentUser() user: AuthenticatedUser): Promise<Movie[]> {
    return this.moviesService.list(user.id);
  }

  @Get('genres')
  @ApiOperation({
    summary: 'List synced movie genres',
    description:
      'Returns all movie genres that have been synced from TMDB and stored in PostgreSQL. Requires a bearer token from login/register.',
  })
  @ApiOkResponse({
    description: 'Movie genres synced from TMDB.',
    schema: {
      example: [
        { id: 28, name: 'Action' },
        { id: 53, name: 'Thriller' },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing, invalid, or expired.',
  })
  genres(): Promise<Genre[]> {
    return this.moviesService.listGenres();
  }

  @Post('sync')
  @ApiOperation({
    summary: 'Sync popular movies from TMDB',
    description:
      'Stores TMDB popular movies, genres, and movie-genre links in PostgreSQL. Use mode=next to append the next page window from the sync cursor. Use mode=refresh to re-fetch previously synced pages in bounded batches using a separate refresh cursor, which avoids large refresh requests timing out as the catalog grows.',
  })
  @ApiQuery({
    name: 'pages',
    required: false,
    example: 15,
    description:
      'Number of TMDB pages to process in this batch. The API clamps this value to TMDB_SYNC_MAX_PAGES, which defaults to 15 and has an absolute safety cap of 100.',
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['next', 'refresh'],
    example: 'next',
    description:
      'Sync mode. next: sync the next N pages from the ingest cursor and advance it. refresh: re-sync the next N pages from the refresh cursor without moving beyond the already synced range or changing the ingest cursor.',
  })
  @ApiOkResponse({
    description:
      'Sync result with mode, TMDB pages processed, and movie count upserted.',
    schema: {
      example: {
        mode: 'next',
        pages: [1, 2, 3],
        synced: 58,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token or valid x-internal-sync-token is required.',
  })
  @ApiHeader({
    name: 'x-internal-sync-token',
    required: false,
    description:
      'Internal token used by the Docker tmdb-sync service. Normal API consumers should use the Authorization bearer token instead.',
  })
  sync(
    @Query('pages') pages = '1',
    @Query('mode') mode: SyncMode = 'next',
  ): Promise<{ mode: SyncMode; pages: number[]; synced: number }> {
    return this.moviesService.syncPopularMovies(
      Number(pages),
      mode === 'refresh' ? 'refresh' : 'next',
    );
  }
}
