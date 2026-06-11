import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'API welcome',
    description:
      'Returns a small public payload that confirms the API is running and gives quick links to Swagger, liveness, and readiness endpoints. This endpoint is useful for browser checks and first-run validation.',
  })
  @ApiOkResponse({
    description: 'Welcome response for browser checks.',
    schema: {
      example: {
        name: 'KIB TMDB Movie API',
        status: 'running',
        docs: '/docs',
        health: '/health',
        ready: '/ready',
      },
    },
  })
  welcome(): {
    name: string;
    status: 'running';
    docs: string;
    health: string;
    ready: string;
  } {
    return {
      name: 'KIB TMDB Movie API',
      status: 'running',
      docs: '/docs',
      health: '/health',
      ready: '/ready',
    };
  }
}
