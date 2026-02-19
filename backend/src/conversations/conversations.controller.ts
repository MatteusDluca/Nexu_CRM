// ============================================================
// ConversationsController — Endpoints REST para conversas
// ============================================================

import {
    Body,
    Controller,
    Get,
    Logger,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
    private readonly logger = new Logger(ConversationsController.name);

    constructor(private readonly conversationsService: ConversationsService) { }

    /**
     * GET /api/conversations
     * Lista conversas com filtros opcionais.
     */
    @Get()
    async findAll(
        @Query('status') status?: ConversationStatus,
        @Query('assigneeId') assigneeId?: string,
        @Query('departmentId') departmentId?: string,
        @Query('sessionId') sessionId?: string,
        @Query('search') search?: string,
    ) {
        return this.conversationsService.findAll({
            status,
            assigneeId,
            departmentId,
            sessionId,
            search,
        });
    }

    /**
     * GET /api/conversations/:id
     * Busca conversa com mensagens.
     */
    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.conversationsService.findById(id);
    }

    /**
     * POST /api/conversations/:id/assign
     * Atribui atendente à conversa.
     */
    @Post(':id/assign')
    async assign(
        @Param('id') id: string,
        @Body('assigneeId') assigneeId: string,
    ) {
        return this.conversationsService.assignToUser(id, assigneeId);
    }

    /**
     * PATCH /api/conversations/:id/status
     * Atualiza status da conversa.
     */
    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: ConversationStatus,
    ) {
        return this.conversationsService.updateStatus(id, status);
    }

    /**
     * POST /api/conversations/:id/read
     * Marca conversa como lida (reseta unread count).
     */
    @Post(':id/read')
    async markAsRead(@Param('id') id: string) {
        return this.conversationsService.markAsRead(id);
    }
}
