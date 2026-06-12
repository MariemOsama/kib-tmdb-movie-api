import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { UserMovieListsRepository } from './user-movie-lists.repository.js';
import { UserMovieListsService } from './user-movie-lists.service.js';
import { CurrentUserController } from './current-user.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CurrentUserController],
  providers: [UserMovieListsRepository, UserMovieListsService],
})
export class UserModule {}
