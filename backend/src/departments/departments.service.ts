// ============================================================
// DepartmentsService — CRUD de departamentos
// ============================================================

import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
    private readonly logger = new Logger(DepartmentsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.department.findMany({
            include: { _count: { select: { users: true, conversations: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string) {
        const dept = await this.prisma.department.findUnique({
            where: { id },
            include: {
                users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
            },
        });
        if (!dept) throw new NotFoundException(`Departamento ${id} não encontrado`);
        return dept;
    }

    async create(data: { name: string; description?: string }) {
        const existing = await this.prisma.department.findUnique({ where: { name: data.name } });
        if (existing) throw new ConflictException('Departamento já existe');

        const dept = await this.prisma.department.create({ data });
        this.logger.log(`🏢 Departamento criado: ${dept.name}`);
        return dept;
    }

    async update(id: string, data: { name?: string; description?: string }) {
        await this.findById(id);
        return this.prisma.department.update({ where: { id }, data });
    }

    async delete(id: string) {
        await this.findById(id);
        await this.prisma.department.delete({ where: { id } });
        this.logger.log(`🗑️ Departamento removido: ${id}`);
        return { deleted: true };
    }
}
