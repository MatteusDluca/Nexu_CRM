// ============================================================
// BotService — CRUD e execução de fluxos de bot
// Os fluxos são armazenados como JSON (nodes + edges do React Flow)
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BotService {
    private readonly logger = new Logger(BotService.name);

    constructor(private readonly prisma: PrismaService) { }

    /** Lista todos os fluxos de bot */
    async findAll() {
        return this.prisma.botFlow.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                trigger: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    /** Busca fluxo por ID (com nodes e edges completos) */
    async findById(id: string) {
        const flow = await this.prisma.botFlow.findUnique({ where: { id } });
        if (!flow) throw new NotFoundException(`Fluxo ${id} não encontrado`);
        return flow;
    }

    /** Cria novo fluxo de bot */
    async create(data: {
        name: string;
        description?: string;
        nodes?: any;
        edges?: any;
        trigger?: string;
    }) {
        const flow = await this.prisma.botFlow.create({
            data: {
                name: data.name,
                description: data.description,
                nodes: data.nodes || [],
                edges: data.edges || [],
                trigger: data.trigger,
            },
        });

        this.logger.log(`🤖 Fluxo de bot criado: ${flow.name}`);
        return flow;
    }

    /** Atualiza fluxo (nodes, edges, trigger, etc.) */
    async update(id: string, data: {
        name?: string;
        description?: string;
        nodes?: any;
        edges?: any;
        trigger?: string;
        isActive?: boolean;
    }) {
        await this.findById(id);
        return this.prisma.botFlow.update({ where: { id }, data });
    }

    /** Ativa/desativa um fluxo */
    async toggleActive(id: string) {
        const flow = await this.findById(id);
        return this.prisma.botFlow.update({
            where: { id },
            data: { isActive: !flow.isActive },
        });
    }

    /** Remove fluxo permanentemente */
    async delete(id: string) {
        await this.findById(id);
        await this.prisma.botFlow.delete({ where: { id } });
        this.logger.log(`🗑️ Fluxo removido: ${id}`);
        return { deleted: true };
    }

    /**
     * Busca fluxo ativo por trigger (palavra-chave).
     * Usado para ativar bots automaticamente quando uma mensagem chega.
     */
    async findByTrigger(trigger: string) {
        return this.prisma.botFlow.findFirst({
            where: {
                trigger,
                isActive: true,
            },
        });
    }
}
