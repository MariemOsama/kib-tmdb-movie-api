import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import {
  ApiMovieQueryDocs,
  buildMovieSearchOptionsFromQuery,
} from '../movies/movie-query.js';
import { type MovieFilter } from '../movies/movie.types.js';
import {
  UserMovieListRemovalResult,
  UserMovieListResponse,
  UserMovieListResult,
} from './user-movie-list.types.js';
import { UserMovieListsService } from './user-movie-lists.service.js';

@ApiTags('user')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userMovieListsService: UserMovieListsService) {}

  @Get('watchlist')
  @ApiOperation({
    summary: 'List current user watchlist',
    description:
      "Returns the current user's watchlist movies ordered by the time they were added.",
  })
  @ApiMovieQueryDocs()
  @ApiOkResponse({
    description: "Current user's watchlist movies.",
    schema: { example: buildListExample('watchlist') },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing, invalid, expired.',
  })
  watchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('limit') limit = '20',
    @Query('filter') filter: MovieFilter = 'all',
    @Query('year') year?: string,
    @Query('genreId') genreId?: string,
    @Query('offset') offset = '0',
  ): Promise<UserMovieListResponse> {
    return this.userMovieListsService.list(user.id, {
      listType: 'watchlist',
      options: buildMovieSearchOptionsFromQuery(
        search,
        limit,
        filter,
        year,
        genreId,
        offset,
      ),
    });
  }

  @Post('watchlist/:movieId')
  @ApiOperation({
    summary: 'Add a movie to current user watchlist',
    description:
      "Adds an existing catalog movie to the current user's watchlist.",
  })
  @ApiParam({
    name: 'movieId',
    example: 123,
    description: 'TMDB movie id already stored in the local movie catalog.',
  })
  @ApiCreatedResponse({
    description: 'Movie added to watchlist, or already existed.',
    schema: { example: { list: 'watchlist', movieId: 123, added: true } },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing, invalid, expired.',
  })
  @ApiNotFoundResponse({
    description: 'Movie does not exist in the local catalog.',
  })
  addToWatchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Promise<UserMovieListResult> {
    return this.userMovieListsService.add(user.id, movieId, 'watchlist');
  }

  @Delete('watchlist/:movieId')
  @ApiOperation({
    summary: 'Remove a movie from current user watchlist',
    description: "Removes a movie from the current user's watchlist.",
  })
  @ApiParam({
    name: 'movieId',
    example: 123,
    description: 'TMDB movie id to remove from the watchlist.',
  })
  @ApiOkResponse({
    description: 'Movie removed from watchlist, or was not present.',
    schema: { example: { list: 'watchlist', movieId: 123, removed: true } },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing, invalid, expired.',
  })
  removeFromWatchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Promise<UserMovieListRemovalResult> {
    return this.userMovieListsService.remove(user.id, movieId, 'watchlist');
  }

  @Get('favorites')
  @ApiOperation({
    summary: 'List current user favorites',
    description:
      "Returns the current user's favorite movies ordered by the time they were added.",
  })
  @ApiMovieQueryDocs()
  @ApiOkResponse({
    description: "Authenticated user's favorite movies.",
    schema: { example: buildListExample('favorites') },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing, invalid, expired.',
  })
  favorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('limit') limit = '20',
    @Query('filter') filter: MovieFilter = 'all',
    @Query('year') year?: string,
    @Query('genreId') genreId?: string,
    @Query('offset') offset = '0',
  ): Promise<UserMovieListResponse> {
    return this.userMovieListsService.list(user.id, {
      listType: 'favorites',
      options: buildMovieSearchOptionsFromQuery(
        search,
        limit,
        filter,
        year,
        genreId,
        offset,
      ),
    });
  }

  @Post('favorites/:movieId')
  @ApiOperation({
    summary: 'Add a movie to current user favorites',
    description:
      "Adds an existing catalog movie to the current user's favorites list.",
  })
  @ApiParam({
    name: 'movieId',
    example: 123,
    description: 'TMDB movie id already stored in the local movie catalog.',
  })
  @ApiCreatedResponse({
    description: 'Movie added to favorites, or already existed.',
    schema: { example: { list: 'favorites', movieId: 123, added: true } },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing, invalid, expired.',
  })
  @ApiNotFoundResponse({
    description: 'Movie does not exist in the local catalog.',
  })
  addToFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Promise<UserMovieListResult> {
    return this.userMovieListsService.add(user.id, movieId, 'favorites');
  }

  @Delete('favorites/:movieId')
  @ApiOperation({
    summary: 'Remove a movie from current user favorites',
    description: "Removes a movie from the current user's favorites list.",
  })
  @ApiParam({
    name: 'movieId',
    example: 123,
    description: 'TMDB movie id to remove from favorites.',
  })
  @ApiOkResponse({
    description: 'Movie removed from favorites, or was not present.',
    schema: { example: { list: 'favorites', movieId: 123, removed: true } },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing, invalid, expired.',
  })
  removeFromFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Promise<UserMovieListRemovalResult> {
    return this.userMovieListsService.remove(user.id, movieId, 'favorites');
  }
}

function buildListExample(
  list: 'watchlist' | 'favorites',
): UserMovieListResponse {
  return {
    list,
    movies: [
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
        usersRatingAverage: 8.25,
        userRatingCount: 4,
        myRating: list === 'favorites' ? 9 : null,
        syncedAt: '2026-06-11T12:00:00.000Z',
        genres: ['Action', 'Thriller'],
        isFavorite: list === 'favorites',
        isInWatchlist: list === 'watchlist',
      },
    ],
  };
}
