import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

/**
 * Smoke e2e test. Requires the infra (Postgres/Mongo/Redis) to be running:
 *   docker compose up -d   →   npm run test:e2e
 */
describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health returns the success envelope', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Service healthy',
      data: { status: 'ok' },
    });
  });

  it('rejects a protected route without a token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me')
      .expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('registers then logs in a user', async () => {
    const email = `e2e_${Date.now()}@example.com`;
    const password = 'S3cure!pwd';

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, firstName: 'E2E' })
      .expect(201);
    expect(reg.body.data.accessToken).toBeDefined();

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    expect(login.body.data.user.email).toBe(email);
  });
});
