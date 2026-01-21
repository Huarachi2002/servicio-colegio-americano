import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT ?? 8080;

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api');
  
  // Configuración CORS optimizada para IIS Proxy Reverso
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*', // Configurable desde .env
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept-Language',
      'X-Original-Host',      // Header del IIS proxy
      'X-Forwarded-For',      // Header del IIS proxy
      'X-Forwarded-Proto'     // Header del IIS proxy
    ],
    exposedHeaders: ['Content-Disposition'], // Para descargas de archivos
    optionsSuccessStatus: 204,
    preflightContinue: false
  });
  
  // Trust proxy - importante cuando está detrás de IIS
  app.set('trust proxy', 1);
  
  await app.listen(port, '0.0.0.0', () => {
    Logger.log(`Servidor ejecutándose en http://localhost:${port}`);
    Logger.log(`Prefijo API: /api`);
  });
}
bootstrap();
