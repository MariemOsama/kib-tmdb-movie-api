import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 8080);
  const swaggerConfig = new DocumentBuilder()
    .setTitle('KIB TMDB Movie API')
    .setDescription('API foundation for the KIB TMDB movie coding challenge.')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, document);
  app.enableShutdownHooks();
  await app.listen(port);
}

void bootstrap();
