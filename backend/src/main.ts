// ============================================================
// main.ts — Bootstrap do WhatsApp CRM Backend
// Inicializa: NestJS, Validação global, CORS, Log_Master
// ============================================================

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // ── Criar aplicação NestJS ─────────────────────────────────
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ── Servir arquivos estáticos (stickers, imagens, etc) ─────
  const mediaDir = path.resolve(process.cwd(), 'media');
  const fs = require('fs');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
  app.useStaticAssets(mediaDir, { prefix: '/media/' });

  // ── Configuração global ────────────────────────────────────
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  // ── Prefixo global da API ──────────────────────────────────
  app.setGlobalPrefix('api');

  // ── CORS — Permitir frontend ───────────────────────────────
  app.enableCors({
    origin: [
      'http://localhost:3000', // Frontend Next.js
      'http://localhost:5173', // Log_Master frontend
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Pipes globais — Validação automática de DTOs ───────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Remove propriedades não declaradas no DTO
      forbidNonWhitelisted: true, // Rejeita requests com props não declaradas
      transform: true,           // Transforma payloads para tipos do DTO
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Filtro global de exceções ────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Log_Master Integration (será configurado na Fase 8) ────
  // TODO: Inicializar log-master-client aqui
  // const logMasterUrl = configService.get<string>('LOG_MASTER_URL');
  // if (logMasterUrl) {
  //   initLogMaster({ serverUrl: logMasterUrl, appName: 'whatsapp-crm' });
  //   logger.log(`📊 Log_Master conectado em ${logMasterUrl}`);
  // }

  // ── Iniciar servidor ───────────────────────────────────────
  await app.listen(port);

  logger.log(`🚀 WhatsApp CRM Backend rodando em http://localhost:${port}`);
  logger.log(`📡 API disponível em http://localhost:${port}/api`);
  logger.log(`🌐 Ambiente: ${configService.get<string>('NODE_ENV', 'development')}`);
}

bootstrap();
