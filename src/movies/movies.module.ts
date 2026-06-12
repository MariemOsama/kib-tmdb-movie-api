import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MoviesController } from './movies.controller.js';
import { MoviesRepository } from './movies.repository.js';
import { MoviesService } from './movies.service.js';
import { TmdbClient } from './tmdb.client.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [MoviesController],
  providers: [MoviesRepository, MoviesService, TmdbClient],
})
export class MoviesModule {}
