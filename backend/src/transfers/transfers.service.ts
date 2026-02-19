// ============================================================
// TransfersService — Lógica de transferência de conversas
// Suporta: transferir para usuário ou departamento
// ============================================================

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConversationStatus, TransferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransfersService {
    private readonly logger = new Logger(TransfersService.name);

    constructor(private readonly prisma: PrismaService) { }

    /** Cria uma transferência de conversa */
    async create(data: {
        conversationId: string;
        fromUserId: string;
        toUserId?: string;
        toDepartmentId?: string;
        reason?: string;
        note?: string;
    }) {
        if (!data.toUserId && !data.toDepartmentId) {
            throw new BadRequestException('Deve especificar destino: usuário ou departamento');
        }

        // Verificar se conversa existe
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: data.conversationId },
        });
        if (!conversation) throw new NotFoundException('Conversa não encontrada');

        // Criar transferência
        const transfer = await this.prisma.transfer.create({
            data: {
                conversationId: data.conversationId,
                fromUserId: data.fromUserId,
                toUserId: data.toUserId,
                toDepartmentId: data.toDepartmentId,
                reason: data.reason,
                note: data.note,
                status: TransferStatus.PENDING,
            },
            include: {
                fromUser: { select: { id: true, name: true } },
                toUser: { select: { id: true, name: true } },
                toDepartment: { select: { id: true, name: true } },
            },
        });

        // Marcar conversa como pendente
        await this.prisma.conversation.update({
            where: { id: data.conversationId },
            data: { status: ConversationStatus.PENDING },
        });

        this.logger.log(
            `🔄 Transferência criada: ${transfer.id} ` +
            `(de: ${data.fromUserId}, para: ${data.toUserId || data.toDepartmentId})`,
        );

        return transfer;
    }

    /** Aceita uma transferência */
    async accept(transferId: string, acceptedByUserId: string) {
        const transfer = await this.prisma.transfer.findUnique({
            where: { id: transferId },
        });
        if (!transfer) throw new NotFoundException('Transferência não encontrada');
        if (transfer.status !== TransferStatus.PENDING) {
            throw new BadRequestException('Transferência não está pendente');
        }

        // Atualizar transferência
        await this.prisma.transfer.update({
            where: { id: transferId },
            data: { status: TransferStatus.ACCEPTED },
        });

        // Atribuir conversa ao novo atendente e reabrir
        await this.prisma.conversation.update({
            where: { id: transfer.conversationId },
            data: {
                assigneeId: acceptedByUserId,
                status: ConversationStatus.OPEN,
                departmentId: transfer.toDepartmentId,
            },
        });

        this.logger.log(`✅ Transferência ${transferId} aceita por ${acceptedByUserId}`);
        return { accepted: true };
    }

    /** Rejeita uma transferência */
    async reject(transferId: string) {
        const transfer = await this.prisma.transfer.findUnique({
            where: { id: transferId },
        });
        if (!transfer) throw new NotFoundException('Transferência não encontrada');

        await this.prisma.transfer.update({
            where: { id: transferId },
            data: { status: TransferStatus.REJECTED },
        });

        // Reabrir conversa para atendente original
        await this.prisma.conversation.update({
            where: { id: transfer.conversationId },
            data: { status: ConversationStatus.OPEN },
        });

        this.logger.log(`❌ Transferência ${transferId} rejeitada`);
        return { rejected: true };
    }

    /** Lista transferências pendentes (para um usuário ou departamento) */
    async findPending(filters?: { toUserId?: string; toDepartmentId?: string }) {
        const where: any = { status: TransferStatus.PENDING };
        if (filters?.toUserId) where.toUserId = filters.toUserId;
        if (filters?.toDepartmentId) where.toDepartmentId = filters.toDepartmentId;

        return this.prisma.transfer.findMany({
            where,
            include: {
                conversation: {
                    include: {
                        contact: { select: { id: true, name: true, phone: true } },
                    },
                },
                fromUser: { select: { id: true, name: true } },
                toUser: { select: { id: true, name: true } },
                toDepartment: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
