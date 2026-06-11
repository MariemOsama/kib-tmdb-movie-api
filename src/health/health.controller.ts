import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  @ApiOkResponse({
    description: 'Liveness check.',
    schema: { example: { status: 'ok' } },
  })
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOkResponse({
    description: 'Readiness check for PostgreSQL and Redis.',
    schema: {
      example: {
        status: 'ready',
        dependencies: {
          postgres: 'ok',
          redis: 'ok',
        },
      },
    },
  })
  async ready(): Promise<{
    status: 'ready';
    dependencies: { postgres: 'ok'; redis: 'ok' };
  }> {
    await Promise.all([this.database.ping(), this.redis.ping()]);

    return {
      status: 'ready',
      dependencies: {
        postgres: 'ok',
        redis: 'ok',
      },
    };
  }
}
