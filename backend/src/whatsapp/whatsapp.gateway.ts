// ============================================================
// WhatsappGateway — Socket.io Gateway para eventos realtime
// Emite QR codes, status de conexão e mensagens em tempo real
// ============================================================

import { forwardRef, Inject, Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WhatsappService } from './whatsapp.service';

@WebSocketGateway({
    cors: {
        origin: [
            'http://localhost:3000', // Frontend Next.js
            'http://localhost:5173', // Log_Master
        ],
        credentials: true,
    },
    namespace: '/whatsapp',
})
export class WhatsappGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(WhatsappGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(
        @Inject(forwardRef(() => WhatsappService))
        private readonly whatsappService: WhatsappService,
    ) { }

    // ── LIFECYCLE ──────────────────────────────────────────────

    afterInit(): void {
        this.logger.log('🔌 WhatsApp WebSocket Gateway inicializado');
    }

    handleConnection(client: Socket): void {
        this.logger.log(`🟢 Cliente conectado: ${client.id}`);
    }

    handleDisconnect(client: Socket): void {
        this.logger.log(`🔴 Cliente desconectado: ${client.id}`);
    }

    // ── EVENTOS DO CLIENTE → SERVIDOR ─────────────────────────

    /**
     * Cliente solicita conectar uma sessão WhatsApp.
     * Retorna QR code em tempo real quando gerado.
     */
    @SubscribeMessage('session:connect')
    async handleSessionConnect(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        this.logger.log(`📱 Cliente ${client.id} solicitou conectar sessão ${data.sessionId}`);

        try {
            // Entrar na room da sessão para receber eventos específicos
            client.join(`session:${data.sessionId}`);

            // Iniciar conexão
            await this.whatsappService.connectSession(data.sessionId);

            // Emitir status atualizado
            const status = await this.whatsappService.getSessionStatus(data.sessionId);
            client.emit('session:status', status);
        } catch (error: any) {
            this.logger.error(`❌ Erro ao conectar sessão: ${error.message}`);
            client.emit('session:error', {
                sessionId: data.sessionId,
                error: error.message,
            });
        }
    }

    /**
     * Cliente solicita desconectar uma sessão.
     */
    @SubscribeMessage('session:disconnect')
    async handleSessionDisconnect(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        this.logger.log(`🔌 Cliente ${client.id} solicitou desconectar sessão ${data.sessionId}`);

        try {
            await this.whatsappService.disconnectSession(data.sessionId);

            // Notificar todos na room
            this.server.to(`session:${data.sessionId}`).emit('session:status', {
                id: data.sessionId,
                status: 'DISCONNECTED',
            });

            client.leave(`session:${data.sessionId}`);
        } catch (error: any) {
            client.emit('session:error', {
                sessionId: data.sessionId,
                error: error.message,
            });
        }
    }

    /**
     * Cliente entra na room de uma sessão para receber eventos.
     */
    @SubscribeMessage('session:subscribe')
    handleSessionSubscribe(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ): void {
        client.join(`session:${data.sessionId}`);
        this.logger.log(`👁️ Cliente ${client.id} inscrito na sessão ${data.sessionId}`);
    }

    // ── MÉTODOS BROADCAST (chamados pelo WhatsappService) ──────

    /**
     * Emite QR code para todos os clientes inscritos na sessão.
     * Chamado pelo WhatsappService quando Baileys gera um QR.
     */
    emitQrCode(sessionId: string, qrDataUrl: string): void {
        this.server.to(`session:${sessionId}`).emit('session:qr', {
            sessionId,
            qrCode: qrDataUrl,
            timestamp: Date.now(),
        });
        this.logger.log(`📷 QR code emitido para sessão ${sessionId}`);
    }

    /**
     * Emite status de conexão para todos os clientes.
     */
    emitConnectionStatus(sessionId: string, status: string, phone?: string): void {
        this.server.to(`session:${sessionId}`).emit('session:status', {
            sessionId,
            status,
            phone,
            timestamp: Date.now(),
        });
        this.logger.log(`📊 Status emitido para sessão ${sessionId}: ${status}`);
    }

    /**
     * Emite nova mensagem recebida para todos os clientes.
     * Broadcast global — frontend filtra por sessão/conversa.
     */
    emitNewMessage(data: any): void {
        this.server.emit('message:new', {
            ...data,
            timestamp: Date.now(),
        });
    }

    /**
     * Emite atualização de status de mensagem (enviada, entregue, lida).
     */
    emitMessageStatusUpdate(data: {
        sessionId: string;
        messageId: string;
        status: string;
    }): void {
        this.server.emit('message:status', data);
    }
}
