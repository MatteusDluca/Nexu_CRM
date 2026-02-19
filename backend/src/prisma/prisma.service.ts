// ============================================================
// PrismaService — Serviço injetável para acesso ao banco
// Encapsula o PrismaClient e gerencia seu lifecycle
// ============================================================

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  /**
   * Conecta ao MongoDB quando o módulo NestJS é inicializado.
   * Logga o estado da conexão para debug.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma conectado ao MongoDB com sucesso');
    } catch (error) {
      this.logger.error('❌ Falha ao conectar Prisma ao MongoDB', error);
      throw error;
    }
  }

  /**
   * Desconecta do MongoDB quando o módulo NestJS é destruído.
   * Garante limpeza correta de conexões.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('🔌 Prisma desconectado do MongoDB');
  }
}
