// ============================================================
// MessagesController — Endpoints de mensagens
// ============================================================

import { Controller, Get, Logger, Param, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
    private readonly logger = new Logger(MessagesController.name);

    constructor(private readonly messagesService: MessagesService) { }

    /**
     * GET /api/messages/:conversationId
     * Busca mensagens de uma conversa com paginação.
     */
    @Get(':conversationId')
    async findByConversation(
        @Param('conversationId') conversationId: string,
        @Query('cursor') cursor?: string,
        @Query('take') take?: number,
    ) {
        return this.messagesService.findByConversation(conversationId, {
            cursor,
            take: take ? Number(take) : undefined,
        });
    }
}
