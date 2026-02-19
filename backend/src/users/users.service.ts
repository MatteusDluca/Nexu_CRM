// ============================================================
// UsersService — CRUD de usuários
// Gerenciamento completo de atendentes do sistema
// ============================================================

import {
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lista todos os usuários (sem senha).
     * Inclui departamento associado.
     */
    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                isActive: true,
                createdAt: true,
                departmentId: true,
                department: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Busca um usuário por ID (sem senha).
     * Lança NotFoundException se não encontrar.
     */
    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                departmentId: true,
                department: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
        }

        return user;
    }

    /**
     * Cria novo usuário (Admin only).
     * Verifica email duplicado e faz hash da senha.
     */
    async create(dto: CreateUserDto) {
        // Verificar email duplicado
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('Email já cadastrado');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);

        const user = await this.prisma.user.create({
            data: {
                ...dto,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                isActive: true,
                createdAt: true,
            },
        });

        this.logger.log(`✅ Usuário criado: ${user.email} (role: ${user.role})`);
        return user;
    }

    /**
     * Atualiza um usuário existente.
     * Se senha for enviada, faz hash antes de salvar.
     */
    async update(id: string, dto: UpdateUserDto) {
        await this.findById(id); // Verifica se existe

        // Hash da nova senha se fornecida
        const data: any = { ...dto };
        if (dto.password) {
            data.password = await bcrypt.hash(dto.password, 12);
        }

        const user = await this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                isActive: true,
                updatedAt: true,
            },
        });

        this.logger.log(`📝 Usuário atualizado: ${user.email}`);
        return user;
    }

    /**
     * Desativa um usuário (soft delete).
     * Não remove do banco, apenas marca isActive = false.
     */
    async deactivate(id: string) {
        await this.findById(id);

        const user = await this.prisma.user.update({
            where: { id },
            data: { isActive: false },
            select: { id: true, email: true, isActive: true },
        });

        this.logger.log(`🔒 Usuário desativado: ${user.email}`);
        return user;
    }

    /**
     * Remove permanentemente um usuário.
     * Usar com cuidado — preferir deactivate().
     */
    async delete(id: string) {
        await this.findById(id);

        await this.prisma.user.delete({ where: { id } });

        this.logger.log(`🗑️ Usuário removido permanentemente: ${id}`);
        return { deleted: true };
    }
}
