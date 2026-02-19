// ============================================================
// TagsService — CRUD de etiquetas com cores e imagens
// ============================================================

import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
    private readonly logger = new Logger(TagsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.tag.findMany({
            include: { _count: { select: { contacts: true, conversations: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string) {
        const tag = await this.prisma.tag.findUnique({ where: { id } });
        if (!tag) throw new NotFoundException(`Tag ${id} não encontrada`);
        return tag;
    }

    async create(data: { name: string; color?: string; iconUrl?: string; imageUrl?: string }) {
        const existing = await this.prisma.tag.findUnique({ where: { name: data.name } });
        if (existing) throw new ConflictException('Tag com este nome já existe');

        const tag = await this.prisma.tag.create({ data });
        this.logger.log(`🏷️ Tag criada: ${tag.name} (${tag.color})`);
        return tag;
    }

    async update(id: string, data: { name?: string; color?: string; iconUrl?: string; imageUrl?: string }) {
        await this.findById(id);
        return this.prisma.tag.update({ where: { id }, data });
    }

    async delete(id: string) {
        await this.findById(id);
        await this.prisma.tag.delete({ where: { id } });
        this.logger.log(`🗑️ Tag removida: ${id}`);
        return { deleted: true };
    }
}
