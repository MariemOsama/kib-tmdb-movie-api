import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 8080);
  const swaggerConfig = new DocumentBuilder()
    .setTitle('KIB TMDB Movie API')
    .setDescription(
      'TMDB movie catalog API with PostgreSQL persistence, Redis readiness checks, register/login authentication, secured movie endpoints, and TMDB popular-movie sync.',
    )
    .setVersion('0.0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Paste the accessToken returned from /auth/register or /auth/login. Do not include the Bearer prefix.',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, document);
  app.enableShutdownHooks();
  await app.listen(port);
}

void bootstrap();
