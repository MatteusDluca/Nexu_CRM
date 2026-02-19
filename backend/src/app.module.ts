// ============================================================
// AppModule — Módulo raiz do WhatsApp CRM Backend
// Configura todos os módulos + middleware de logging
// ============================================================

import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { ContactsModule } from './contacts/contacts.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DepartmentsModule } from './departments/departments.module';
import { MessagesModule } from './messages/messages.module';
import { PrismaModule } from './prisma/prisma.module';
import { TagsModule } from './tags/tags.module';
import { TransfersModule } from './transfers/transfers.module';
import { UsersModule } from './users/users.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    // ── Configuração global de env vars ──────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── Prisma (MongoDB) ─────────────────────────────────────
    PrismaModule,

    // ── BullMQ (Redis) — Filas de processamento ──────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),

    // ── Módulos de Features ──────────────────────────────────
    AuthModule,
    UsersModule,
    WhatsappModule,
    ConversationsModule,
    MessagesModule,
    ContactsModule,
    TagsModule,
    DepartmentsModule,
    TransfersModule,
    BotModule,
    MediaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  /**
   * Registra LoggingMiddleware globalmente em todas as rotas.
   * Loga métricas HTTP (method, url, status, duração) em cada request.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
