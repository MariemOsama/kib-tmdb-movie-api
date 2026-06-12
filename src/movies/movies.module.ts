import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MoviesController } from './movies.controller.js';
import { MoviesRepository } from './movies.repository.js';
import { MoviesService } from './movies.service.js';
import { TmdbClient } from './tmdb.client.js';
import { AuthModule } from '../auth/auth.module.js';
import { MovieCacheService } from './movie-cache.service.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [AuthModule, DatabaseModule, RedisModule],
  controllers: [MoviesController],
  providers: [MoviesRepository, MoviesService, TmdbClient],
  exports: [MovieCacheService],
})
export class MoviesModule {}
