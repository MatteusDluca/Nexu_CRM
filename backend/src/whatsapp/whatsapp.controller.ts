// ============================================================
// WhatsappController — API REST para sessões WhatsApp
// POST /api/whatsapp/sessions — Criar sessão
// GET  /api/whatsapp/sessions — Listar sessões
// POST /api/whatsapp/sessions/:id/connect — Conectar
// POST /api/whatsapp/sessions/:id/disconnect — Desconectar
// GET  /api/whatsapp/sessions/:id — Status da sessão
// DELETE /api/whatsapp/sessions/:id — Remover sessão
// POST /api/whatsapp/sessions/:id/send — Enviar mensagem
// ============================================================

import {
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    Param,
    Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Roles } from '../common/decorators/auth.decorators';
import { WhatsappService } from './whatsapp.service';

// ── DTOs ─────────────────────────────────────────────────────

class CreateSessionDto {
    @IsString()
    @IsNotEmpty({ message: 'Nome da sessão é obrigatório' })
    name: string;
}

class SendMessageDto {
    @IsString()
    @IsNotEmpty({ message: 'JID do destinatário é obrigatório' })
    jid: string;

    @IsString()
    @IsOptional()
    text?: string;

    @IsString()
    @IsOptional()
    mediaUrl?: string;

    @IsString()
    @IsOptional()
    caption?: string;
}

@Controller('whatsapp')
export class WhatsappController {
    private readonly logger = new Logger(WhatsappController.name);

    constructor(private readonly whatsappService: WhatsappService) { }

    /**
     * POST /api/whatsapp/sessions
     * Cria nova sessão WhatsApp. Apenas Admin pode criar sessões.
     */
    @Post('sessions')
    @Roles(Role.ADMIN)
    async createSession(@Body() dto: CreateSessionDto) {
        this.logger.log(`📱 Criando sessão: ${dto.name}`);
        return this.whatsappService.createSession(dto.name);
    }

    /**
     * GET /api/whatsapp/sessions
     * Lista todas as sessões. Qualquer autenticado pode ver.
     */
    @Get('sessions')
    async listSessions() {
        return this.whatsappService.listSessions();
    }

    /**
     * GET /api/whatsapp/sessions/:id
     * Retorna status detalhado de uma sessão.
     */
    @Get('sessions/:id')
    async getSessionStatus(@Param('id') id: string) {
        return this.whatsappService.getSessionStatus(id);
    }

    /**
     * POST /api/whatsapp/sessions/:id/connect
     * Inicia conexão de uma sessão (gera QR code via Socket.io).
     * Apenas Admin pode conectar.
     */
    @Post('sessions/:id/connect')
    @Roles(Role.ADMIN)
    async connectSession(@Param('id') id: string) {
        this.logger.log(`🔄 Conectando sessão: ${id}`);
        await this.whatsappService.connectSession(id);
        return { message: 'Sessão em processo de conexão. Aguarde o QR code via WebSocket.' };
    }

    /**
     * POST /api/whatsapp/sessions/:id/disconnect
     * Desconecta uma sessão. Apenas Admin.
     */
    @Post('sessions/:id/disconnect')
    @Roles(Role.ADMIN)
    async disconnectSession(@Param('id') id: string) {
        this.logger.log(`🔌 Desconectando sessão: ${id}`);
        await this.whatsappService.disconnectSession(id);
        return { message: 'Sessão desconectada' };
    }

    /**
     * DELETE /api/whatsapp/sessions/:id
     * Remove sessão permanentemente. Apenas Admin.
     */
    @Delete('sessions/:id')
    @Roles(Role.ADMIN)
    async deleteSession(@Param('id') id: string) {
        this.logger.log(`🗑️ Removendo sessão: ${id}`);
        await this.whatsappService.deleteSession(id);
        return { message: 'Sessão removida' };
    }

    /**
     * POST /api/whatsapp/sessions/:id/send
     * Envia mensagem via sessão. Qualquer autenticado pode enviar.
     */
    @Post('sessions/:id/send')
    async sendMessage(
        @Param('id') id: string,
        @Body() dto: SendMessageDto,
    ) {
        this.logger.log(`📤 Enviando mensagem via sessão ${id} para ${dto.jid}`);
        return this.whatsappService.sendMessage(id, dto.jid, {
            text: dto.text,
            mediaUrl: dto.mediaUrl,
            caption: dto.caption,
        });
    }

    /**
     * POST /api/whatsapp/sessions/:id/sync-contacts
     * Força a sincronização de contatos (importa nomes da agenda do celular).
     * Útil quando os nomes estão desatualizados ou incorretos.
     */
    @Post('sessions/:id/sync-contacts')
    @Roles(Role.ADMIN)
    async syncContacts(@Param('id') id: string) {
        this.logger.log(`📇 Sincronizando contatos manualmente: sessão ${id}`);
        await this.whatsappService.syncContactsForSession(id);
        return { message: 'Sincronização iniciada. Os nomes serão atualizados em breve.' };
    }

    /**
     * POST /api/whatsapp/sessions/:id/read-receipt
     * Envia read receipt (✓✓ azul) para todas as mensagens não lidas de uma conversa.
     * Chamado automaticamente quando o atendente abre uma conversa no CRM.
     */
    @Post('sessions/:id/read-receipt')
    async sendReadReceipt(
        @Param('id') id: string,
        @Body() body: { conversationId: string },
    ) {
        this.logger.log(`👁️ Enviando read receipt: sessão ${id}, conversa ${body.conversationId}`);
        await this.whatsappService.markAsReadOnWhatsApp(id, body.conversationId);
        return { message: 'Read receipt enviado' };
    }
}
