// ============================================================
// Testes E2E — Verificação de saúde do sistema
// ============================================================

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('WhatsApp CRM Backend (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Auth Tests ─────────────────────────────────────────────

  describe('Auth (/api/auth)', () => {
    const testUser = {
      name: 'Test User E2E',
      email: `test-e2e-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };
    let accessToken: string;
    let refreshToken: string;

    it('POST /auth/register — deve criar novo usuário', async () => {
      const request = (await import('supertest')).default;
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.name).toBe(testUser.name);

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('POST /auth/login — deve rejeitar credenciais inválidas', async () => {
      const request = (await import('supertest')).default;
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrong' })
        .expect(401);
    });

    it('GET /auth/me — deve retornar user autenticado', async () => {
      const request = (await import('supertest')).default;
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(testUser.email);
    });

    it('GET /auth/me — deve rejeitar sem token', async () => {
      const request = (await import('supertest')).default;
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });
  });

  // ── Protected Routes ───────────────────────────────────────

  describe('Protected Routes (sem auth)', () => {
    it.each([
      '/api/users',
      '/api/conversations',
      '/api/contacts',
      '/api/tags',
      '/api/whatsapp/sessions',
    ])('%s — deve rejeitar sem token', async (route) => {
      const request = (await import('supertest')).default;
      await request(app.getHttpServer()).get(route).expect(401);
    });
  });
});
