import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    rawBody: true, // needed for Stripe/Razorpay webhook signature verification
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = config.get<string>('app.apiPrefix') ?? 'api';
  const port = config.get<number>('app.port') ?? 4000;
  const frontendUrl = config.get<string>('app.frontendUrl');
  const isProd = config.get<string>('app.nodeEnv') === 'production';

  app.setGlobalPrefix(apiPrefix, { exclude: ['health', 'sitemap.xml', 'robots.txt'] });

  // Production pins CORS to the configured storefront origin. Development
  // accepts any localhost port: `next dev` hops to 3001 whenever 3000 is
  // busy, and a browser storefront whose every XHR dies on preflight is a
  // far worse failure mode than a permissive localhost in dev.
  app.enableCors({
    origin: isProd ? frontendUrl : /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    credentials: true,
  });

  // Serve local-storage uploads statically at /uploads/**
  const uploadDir = config.get<string>('storage.local.dir') ?? 'uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), { prefix: '/uploads/' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-Commerce Platform API')
    .setDescription('NestJS API — Phase 1 (Auth, Users, Upload, Config, Admin)')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(port);
  logger.log(`API ready on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger docs on http://localhost:${port}/${apiPrefix}/docs`);
}

void bootstrap();
