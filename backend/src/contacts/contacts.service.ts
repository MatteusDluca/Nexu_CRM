// ============================================================
// ContactsService — CRUD de contatos CRM
// Com suporte a campos dinâmicos e tags
// ============================================================

import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactsService {
    private readonly logger = new Logger(ContactsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /** Lista contatos com busca e paginação */
    async findAll(options?: { search?: string; take?: number; skip?: number }) {
        const where: any = {};

        if (options?.search) {
            where.OR = [
                { name: { contains: options.search, mode: 'insensitive' } },
                { phone: { contains: options.search } },
                { email: { contains: options.search, mode: 'insensitive' } },
            ];
        }

        return this.prisma.contact.findMany({
            where,
            include: {
                tags: { select: { id: true, name: true, color: true } },
                _count: { select: { conversations: true } },
            },
            take: options?.take || 50,
            skip: options?.skip || 0,
            orderBy: { updatedAt: 'desc' },
        });
    }

    /** Busca contato por ID com histórico de conversas */
    async findById(id: string) {
        const contact = await this.prisma.contact.findUnique({
            where: { id },
            include: {
                tags: true,
                conversations: {
                    orderBy: { lastActivity: 'desc' },
                    take: 10,
                    include: {
                        assignee: { select: { id: true, name: true } },
                    },
                },
            },
        });

        if (!contact) throw new NotFoundException(`Contato ${id} não encontrado`);
        return contact;
    }

    /** Busca ou cria contato por telefone (usado nas mensagens recebidas) */
    async findOrCreateByPhone(phone: string, name?: string) {
        const existing = await this.prisma.contact.findUnique({ where: { phone } });
        if (existing) return existing;

        const contact = await this.prisma.contact.create({
            data: { phone, name },
        });

        this.logger.log(`👤 Novo contato criado: ${phone}`);
        return contact;
    }

    /** Cria contato com dados completos */
    async create(data: {
        phone: string;
        name?: string;
        email?: string;
        notes?: string;
        customFields?: any;
        tagIds?: string[];
    }) {
        const existing = await this.prisma.contact.findUnique({
            where: { phone: data.phone },
        });
        if (existing) throw new ConflictException('Telefone já cadastrado');

        return this.prisma.contact.create({
            data: {
                phone: data.phone,
                name: data.name,
                email: data.email,
                notes: data.notes,
                customFields: data.customFields,
                tagIds: data.tagIds || [],
            },
            include: { tags: true },
        });
    }

    /** Atualiza contato */
    async update(id: string, data: {
        name?: string;
        email?: string;
        notes?: string;
        customFields?: any;
        tagIds?: string[];
    }) {
        await this.findById(id);

        return this.prisma.contact.update({
            where: { id },
            data,
            include: { tags: true },
        });
    }

    /** Remove contato */
    async delete(id: string) {
        await this.findById(id);
        await this.prisma.contact.delete({ where: { id } });
        this.logger.log(`🗑️ Contato removido: ${id}`);
        return { deleted: true };
    }
}
