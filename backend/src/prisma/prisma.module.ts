// ============================================================
// PrismaModule — Módulo global que exporta PrismaService
// Importado uma vez no AppModule, disponível em todo o app
// ============================================================

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule { }
