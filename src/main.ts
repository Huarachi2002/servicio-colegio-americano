import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 8080;

  app.useGlobalPipes(new ValidationPipe())
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: "Content-Type,Authorization,X-Requested-With,Accept-Language",
    optionsSuccessStatus: 204
  });
  await app.listen(port, '0.0.0.0', () => {
    Logger.log(`Servidor ejecutándose en http://localhost:${port}`);
  });
}
bootstrap();
