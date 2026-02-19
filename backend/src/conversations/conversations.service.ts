// ============================================================
// ConversationsService — Lógica de conversas
// Lista, busca, atualiza status, atribui atendente
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
    private readonly logger = new Logger(ConversationsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lista conversas com filtros opcionais.
     * Inclui: contato, atendente, departamento, última mensagem.
     */
    async findAll(filters?: {
        status?: ConversationStatus;
        assigneeId?: string;
        departmentId?: string;
        sessionId?: string;
        search?: string;
    }) {
        const where: any = {};

        if (filters?.status) where.status = filters.status;
        if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
        if (filters?.departmentId) where.departmentId = filters.departmentId;
        if (filters?.sessionId) where.sessionId = filters.sessionId;

        // Busca por nome ou telefone do contato
        if (filters?.search) {
            where.contact = {
                OR: [
                    { name: { contains: filters.search, mode: 'insensitive' } },
                    { phone: { contains: filters.search } },
                ],
            };
        }

        return this.prisma.conversation.findMany({
            where,
            include: {
                contact: {
                    select: { id: true, name: true, phone: true, avatarUrl: true },
                },
                assignee: {
                    select: { id: true, name: true, avatar: true },
                },
                department: {
                    select: { id: true, name: true },
                },
                tags: {
                    select: { id: true, name: true, color: true },
                },
            },
            orderBy: { lastActivity: 'desc' },
        });
    }

    /**
     * Busca uma conversa por ID com mensagens.
     */
    async findById(id: string) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id },
            include: {
                contact: true,
                assignee: {
                    select: { id: true, name: true, email: true, avatar: true },
                },
                department: true,
                tags: true,
                messages: {
                    orderBy: { timestamp: 'asc' },
                    take: 50, // Paginação — últimas 50 mensagens
                },
            },
        });

        if (!conversation) {
            throw new NotFoundException(`Conversa ${id} não encontrada`);
        }

        return conversation;
    }

    /**
     * Cria ou obtém conversa para um contato/sessão.
     * Se já existe conversa aberta, retorna ela.
     */
    async findOrCreate(sessionId: string, contactId: string) {
        // Buscar conversa aberta existente
        const existing = await this.prisma.conversation.findFirst({
            where: {
                sessionId,
                contactId,
                status: { in: [ConversationStatus.OPEN, ConversationStatus.PENDING] },
            },
            include: { contact: true },
        });

        if (existing) return existing;

        // Criar nova conversa
        const conversation = await this.prisma.conversation.create({
            data: {
                sessionId,
                contactId,
                status: ConversationStatus.OPEN,
            },
            include: { contact: true },
        });

        this.logger.log(`💬 Nova conversa criada: ${conversation.id}`);
        return conversation;
    }

    /**
     * Atribui um atendente à conversa.
     */
    async assignToUser(conversationId: string, assigneeId: string) {
        const conversation = await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { assigneeId },
            include: {
                assignee: { select: { id: true, name: true } },
            },
        });

        this.logger.log(`👤 Conversa ${conversationId} atribuída a ${assigneeId}`);
        return conversation;
    }

    /**
     * Atualiza status da conversa (OPEN, PENDING, CLOSED).
     */
    async updateStatus(conversationId: string, status: ConversationStatus) {
        return this.prisma.conversation.update({
            where: { id: conversationId },
            data: { status },
        });
    }

    /**
     * Atualiza a última mensagem e atividade de uma conversa.
     * Chamado automaticamente quando uma mensagem é recebida/enviada.
     */
    async updateLastMessage(conversationId: string, lastMessage: string) {
        return this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessage,
                lastActivity: new Date(),
            },
        });
    }

    /**
     * Incrementa contador de mensagens não lidas.
     */
    async incrementUnread(conversationId: string) {
        return this.prisma.conversation.update({
            where: { id: conversationId },
            data: { unreadCount: { increment: 1 } },
        });
    }

    /**
     * Reseta contador de não lidas (quando o atendente abre a conversa).
     */
    async markAsRead(conversationId: string) {
        return this.prisma.conversation.update({
            where: { id: conversationId },
            data: { unreadCount: 0 },
        });
    }
}
