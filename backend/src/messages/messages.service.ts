// ============================================================
// MessagesService — Persistência e busca de mensagens
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { MessageStatus, MessageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
    private readonly logger = new Logger(MessagesService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Busca mensagens de uma conversa com paginação cursor-based.
     */
    async findByConversation(
        conversationId: string,
        options?: { cursor?: string; take?: number },
    ) {
        const take = options?.take || 50;

        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { timestamp: 'desc' },
            take,
            ...(options?.cursor && {
                skip: 1,
                cursor: { id: options.cursor },
            }),
        });
    }

    /**
     * Cria uma nova mensagem (recebida ou enviada).
     */
    async create(data: {
        conversationId: string;
        sessionId: string;
        contactId?: string;
        type?: MessageType;
        content?: string;
        mediaUrl?: string;
        caption?: string;
        fromMe?: boolean;
        whatsappId?: string;
        status?: MessageStatus;
    }) {
        const message = await this.prisma.message.create({
            data: {
                conversationId: data.conversationId,
                sessionId: data.sessionId,
                contactId: data.contactId,
                type: data.type || MessageType.TEXT,
                content: data.content,
                mediaUrl: data.mediaUrl,
                caption: data.caption,
                fromMe: data.fromMe || false,
                whatsappId: data.whatsappId,
                status: data.status || MessageStatus.PENDING,
            },
        });

        this.logger.log(
            `💬 Mensagem ${data.fromMe ? 'enviada' : 'recebida'}: ` +
            `${message.id} (conversa: ${data.conversationId})`,
        );

        return message;
    }

    /**
     * Atualiza status de uma mensagem (SENT, DELIVERED, READ, FAILED).
     */
    async updateStatus(messageId: string, status: MessageStatus) {
        return this.prisma.message.update({
            where: { id: messageId },
            data: { status },
        });
    }

    /**
     * Busca mensagem por whatsappId (para tracking de status).
     */
    async findByWhatsappId(whatsappId: string) {
        return this.prisma.message.findFirst({
            where: { whatsappId },
        });
    }
}
