import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global rate limit middleware (5 requests per minute per IP)
  app.use(
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5, // Max 5 requests per IP
      message: {
        statusCode: 429,
        message: 'Too many requests, please try again later.',
        error: 'Too Many Requests',
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(3000);
}
bootstrap();
