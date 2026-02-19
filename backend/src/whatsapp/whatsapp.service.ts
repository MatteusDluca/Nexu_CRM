// ============================================================
// WhatsappService — Gerenciador multi-sessão Baileys
// Cada sessão = 1 instância do Baileys conectada ao WhatsApp
// Suporta: criar sessão, gerar QR, enviar msg, desconectar
// ============================================================

import {
    forwardRef,
    Inject,
    Injectable,
    Logger,
    OnModuleDestroy,
} from '@nestjs/common';
import { MessageStatus, MessageType, SessionStatus } from '@prisma/client';
import makeWASocket, {
    DisconnectReason,
    downloadMediaMessage,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    WASocket
} from '@whiskeysockets/baileys';
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappGateway } from './whatsapp.gateway';
// @ts-ignore
const { makeInMemoryStore } = require('@whiskeysockets/baileys');

/**
 * Tipo de evento emitido quando uma mensagem é recebida.
 */
export interface WhatsappMessageEvent {
    sessionId: string;
    remoteJid: string;
    message: {
        id: string;
        text?: string;
        type: string;
        fromMe: boolean;
        timestamp: number;
        mediaUrl?: string;
        caption?: string;
    };
}

/**
 * Tipo de evento emitido quando o QR code é gerado.
 */
export interface WhatsappQrEvent {
    sessionId: string;
    qrCode: string;
}

/**
 * Interface para dados de sessão armazenados em memória.
 */
interface SessionData {
    socket: WASocket | null;
    qrRetryCount: number;
    qrDataUrl?: string;
}

@Injectable()
export class WhatsappService implements OnModuleDestroy {
    private readonly logger = new Logger(WhatsappService.name);

    /**
     * Map de sessões ativas em memória.
     * Key = sessionId (ObjectId do MongoDB)
     * Value = SessionData com o socket Baileys + metadata
     */
    private sessions: Map<string, SessionData> = new Map();
    private store: ReturnType<typeof makeInMemoryStore>;

    /**
     * Diretório base para armazenar auth states do Baileys.
     * Cada sessão terá sua subpasta: ./auth_sessions/{sessionId}/
     */
    private readonly authBaseDir = path.resolve(process.cwd(), 'auth_sessions');

    /**
     * Diretório para mídia baixada (stickers, imagens, etc).
     * Servido como estático via NestJS em /media/
     */
    private readonly mediaBaseDir = path.resolve(process.cwd(), 'media');

    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => WhatsappGateway))
        private readonly gateway: WhatsappGateway,
        private readonly contactsService: ContactsService,
        private readonly conversationsService: ConversationsService,
        private readonly messagesService: MessagesService,
    ) {
        // Criar diretórios necessários
        for (const dir of [this.authBaseDir, this.mediaBaseDir, path.join(this.mediaBaseDir, 'stickers')]) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }

        // Inicializar Store com persistência
        // @ts-ignore - makeInMemoryStore pode não estar tipado corretamente em algumas versões
        this.store = makeInMemoryStore({ logger: this.logger });
        const storePath = path.join(this.authBaseDir, 'store.json');
        try {
            this.store.readFromFile(storePath);
            this.logger.log(`📚 Store carregado de ${storePath}`);
        } catch (e) {
            this.logger.log('📚 Novo store iniciado');
        }

        // Salvar store a cada 10s
        setInterval(() => {
            try {
                this.store.writeToFile(storePath);
            } catch (e) { } // Silenciar erro de I/O em loop
        }, 10_000);
    }

    // ── LIFECYCLE ──────────────────────────────────────────────

    async onModuleDestroy(): Promise<void> {
        this.logger.log('🔌 Desconectando todas as sessões WhatsApp...');
        const disconnectPromises = Array.from(this.sessions.keys()).map(
            (id) => this.disconnectSession(id),
        );
        await Promise.allSettled(disconnectPromises);
        this.logger.log('✅ Todas as sessões desconectadas');
    }

    // ── CRIAR SESSÃO ──────────────────────────────────────────

    async createSession(name: string): Promise<any> {
        const session = await this.prisma.whatsAppSession.create({
            data: {
                name,
                status: SessionStatus.DISCONNECTED,
            },
        });

        this.logger.log(`📱 Sessão criada: ${session.name} (${session.id})`);
        return session;
    }

    // ── CONECTAR SESSÃO (BAILEYS REAL) ─────────────────────────

    /**
     * Conecta uma sessão ao WhatsApp usando Baileys.
     *
     * Fluxo:
     * 1. Carrega auth state do filesystem (multi-file)
     * 2. Cria instância do Baileys (makeWASocket)
     * 3. Se precisa autenticar, gera QR code
     * 4. Emite eventos de QR/conexão via Socket.io
     * 5. Ao receber mensagem, persiste contato + conversa + mensagem
     */
    async connectSession(sessionId: string): Promise<void> {
        const session = await this.prisma.whatsAppSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            throw new Error(`Sessão ${sessionId} não encontrada`);
        }

        if (this.sessions.has(sessionId)) {
            this.logger.warn(`⚠️ Sessão ${sessionId} já está ativa`);
            return;
        }

        this.logger.log(`🔄 Conectando sessão ${session.name}...`);

        await this.prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: { status: SessionStatus.CONNECTING },
        });

        const authDir = path.join(this.authBaseDir, sessionId);
        if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
        }

        try {
            const { state, saveCreds } = await useMultiFileAuthState(authDir);
            const { version } = await fetchLatestBaileysVersion();
            this.logger.log(`📌 Usando WhatsApp Web v${version.join('.')}`);

            const sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: true,
                browser: ['WhatsApp CRM', 'Chrome', '120.0.0'],
                generateHighQualityLinkPreview: true,
                syncFullHistory: true, // IMPORTANTE: Baixar histórico completo
            });

            this.sessions.set(sessionId, {
                socket: sock,
                qrRetryCount: 0,
            });

            // ── EVENT HANDLERS ──────────────────────────────────

            // 1. Salvar credenciais quando atualizadas e Bindar Store
            sock.ev.on('creds.update', saveCreds);
            this.store.bind(sock.ev);

            // 2. Handler de conexão (QR code, conexão, desconexão)
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    const sessionData = this.sessions.get(sessionId);
                    if (sessionData) {
                        sessionData.qrRetryCount++;
                        this.logger.log(`📷 QR code #${sessionData.qrRetryCount} gerado para sessão ${session.name}`);

                        if (sessionData.qrRetryCount > 5) {
                            this.logger.warn(`⚠️ Limite de QR atingido para sessão ${session.name}`);
                            await this.disconnectSession(sessionId);
                            await this.prisma.whatsAppSession.update({
                                where: { id: sessionId },
                                data: { status: SessionStatus.ERROR, qrCode: null },
                            });
                            this.gateway.emitConnectionStatus(sessionId, 'ERROR');
                            return;
                        }

                        try {
                            const qrDataUrl = await QRCode.toDataURL(qr, {
                                width: 300,
                                margin: 2,
                                color: { dark: '#000000', light: '#FFFFFF' },
                            });

                            sessionData.qrDataUrl = qrDataUrl;

                            await this.prisma.whatsAppSession.update({
                                where: { id: sessionId },
                                data: { status: SessionStatus.QR_READY, qrCode: qrDataUrl },
                            });

                            this.gateway.emitQrCode(sessionId, qrDataUrl);
                        } catch (qrError) {
                            this.logger.error(`❌ Erro ao gerar QR image: ${qrError}`);
                        }
                    }
                }

                // Conexão estabelecida com sucesso
                if (connection === 'open') {
                    this.logger.log(`✅ Sessão ${session.name} conectada!`);

                    const phone = sock.user?.id?.split(':')[0] || sock.user?.id?.split('@')[0];

                    await this.prisma.whatsAppSession.update({
                        where: { id: sessionId },
                        data: {
                            status: SessionStatus.CONNECTED,
                            phone: phone || null,
                            qrCode: null,
                        },
                    });

                    const sd = this.sessions.get(sessionId);
                    if (sd) {
                        sd.qrDataUrl = undefined;
                        sd.qrRetryCount = 0;
                    }

                    this.gateway.emitConnectionStatus(sessionId, 'CONNECTED', phone);

                    // ── GROUPS: Buscar grupos explicitamente ────────
                    this.fetchGroups(sessionId, sock).catch((err) => {
                        this.logger.warn(`⚠️ Erro ao buscar grupos: ${err.message}`);
                    });

                    // ── SYNC: Carregar contatos do WhatsApp ──────────
                    this.syncContacts(sessionId, sock).catch((err) => {
                        this.logger.warn(`⚠️ Erro ao sincronizar contatos: ${err.message}`);
                    });

                    // ── HISTÓRICO: Tentar carregar histórico ativo
                    // Aguardar um pouco para o syncFullHistory popular o store
                    setTimeout(() => {
                        this.fetchActiveHistory(sessionId).catch(console.error);
                    }, 5000);
                }

                // Conexão fechada
                if (connection === 'close') {
                    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    this.logger.warn(
                        `🔌 Sessão ${session.name} desconectada. Código: ${statusCode}. Reconectar: ${shouldReconnect}`,
                    );

                    this.sessions.delete(sessionId);

                    if (shouldReconnect) {
                        this.logger.log(`🔄 Tentando reconectar sessão ${session.name} em 3s...`);
                        setTimeout(() => {
                            this.connectSession(sessionId).catch((err) => {
                                this.logger.error(`❌ Falha ao reconectar: ${err.message}`);
                            });
                        }, 3000);
                    } else {
                        this.logger.log(`🚪 Sessão ${session.name} fez logout. Limpando credenciais...`);
                        try {
                            fs.rmSync(authDir, { recursive: true, force: true });
                        } catch (e) {
                            this.logger.warn(`⚠️ Erro ao limpar auth: ${e}`);
                        }

                        await this.prisma.whatsAppSession.update({
                            where: { id: sessionId },
                            data: {
                                status: SessionStatus.DISCONNECTED,
                                phone: null,
                                qrCode: null,
                            },
                        });

                        this.gateway.emitConnectionStatus(sessionId, 'DISCONNECTED');
                    }
                }
            });

            // 3. Handler de mensagens recebidas — PERSISTE NO BANCO
            sock.ev.on('messages.upsert', async (m) => {
                if (m.type !== 'notify') return;

                for (const msg of m.messages) {
                    if (!msg.key.remoteJid || msg.key.remoteJid === 'status@broadcast') continue;
                    // Filtro de grupo REMOVIDO na Fase 12 para suporte total
                    // if (msg.key.remoteJid.endsWith('@g.us')) continue;

                    try {
                        await this.handleIncomingMessage(sessionId, msg);
                    } catch (error: any) {
                        this.logger.error(
                            `❌ Erro ao processar mensagem de ${msg.key.remoteJid}: ${error.message}`,
                        );
                    }
                }
            });

            // 4. Handler de atualização de status de mensagem
            sock.ev.on('messages.update', async (updates) => {
                for (const update of updates) {
                    if (update.update?.status) {
                        const statusMap: Record<number, string> = {
                            2: 'SENT',
                            3: 'DELIVERED',
                            4: 'READ',
                        };
                        const statusStr = statusMap[update.update.status];
                        if (statusStr && update.key.id) {
                            try {
                                const dbMsg = await this.messagesService.findByWhatsappId(update.key.id);
                                if (dbMsg) {
                                    await this.messagesService.updateStatus(dbMsg.id, statusStr as any);
                                    this.gateway.emitMessageStatusUpdate({
                                        sessionId,
                                        messageId: dbMsg.id,
                                        status: statusStr,
                                    });
                                }
                            } catch (err) {
                                // Silenciar — pode ser msg que não está no banco
                            }
                        }
                    }
                }
            });

            // 5. Handler de contatos recebidos (sync)
            sock.ev.on('contacts.upsert', async (contacts) => {
                this.logger.log(`📇 ${contacts.length} contatos recebidos na sessão ${session.name}`);
                for (const contact of contacts) {
                    if (!contact.id || contact.id === 'status@broadcast') continue;
                    // Filtro de grupo REMOVIDO
                    // if (contact.id.endsWith('@g.us')) continue;

                    const phone = contact.id.split('@')[0];
                    // PRIORIZAR nome salvo no telefone (name) sobre nome do perfil (notify)
                    const savedName = (contact as any).name || undefined;
                    const profileName = (contact as any).notify || undefined;
                    const name = savedName || profileName;

                    try {
                        const existing = await this.contactsService.findOrCreateByPhone(phone, name);
                        // Atualizar nome se temos um nome salvo melhor
                        if (existing && name) {
                            // Se o contato tem nome salvo no telefone, sempre priorizar
                            if (savedName && existing.name !== savedName) {
                                await this.prisma.contact.update({
                                    where: { id: existing.id },
                                    data: { name: savedName },
                                });
                                this.logger.log(`📇 Contato ${phone} atualizado: ${existing.name} → ${savedName}`);
                            } else if (!existing.name && profileName) {
                                await this.prisma.contact.update({
                                    where: { id: existing.id },
                                    data: { name: profileName },
                                });
                            }
                        }
                    } catch (err) {
                        // Silenciar erros de sync individual
                    }
                }
            });

            // 6. Handler de histórico de conversas (sync inicial)
            sock.ev.on('messaging-history.set', async (data: any) => {
                const { chats, contacts: histContacts, messages: histMessages } = data;

                this.logger.log(
                    `📜 Histórico recebido: ${chats?.length || 0} chats, ${histContacts?.length || 0} contatos, ${histMessages?.length || 0} mensagens`,
                );

                // Sincronizar contatos do histórico
                if (histContacts && histContacts.length > 0) {
                    for (const contact of histContacts) {
                        if (!contact.id || contact.id === 'status@broadcast') continue;

                        const phone = contact.id.split('@')[0];
                        const savedName = contact.name || undefined;
                        const profileName = contact.notify || undefined;
                        const name = savedName || profileName;

                        try {
                            const existing = await this.contactsService.findOrCreateByPhone(phone, name);
                            if (existing && savedName && existing.name !== savedName) {
                                await this.prisma.contact.update({
                                    where: { id: existing.id },
                                    data: { name: savedName },
                                });
                            }
                        } catch (err) {
                            // Silenciar
                        }
                    }
                }

                // Sincronizar chats do histórico (criar conversas)
                if (chats && chats.length > 0) {
                    let importedCount = 0;
                    for (const chat of chats) {
                        if (!chat.id || chat.id === 'status@broadcast') continue;

                        const phone = chat.id.split('@')[0];
                        try {
                            const contact = await this.contactsService.findOrCreateByPhone(phone);
                            const conversation = await this.conversationsService.findOrCreate(sessionId, contact.id);

                            // Atualizar lastMessage se o chat tem
                            // Tentar acessar message ou conversation do chat
                            if (chat.conversationTimestamp) {
                                // chat do baileys pode ter .messages (se vier com msg) ou só metadata
                                // se vier pelo historico, geralmente vem só metadata do chat, msg vem separada
                                // Mas podemos tentar pegar o lastMessage
                                // No tipo Chat do Baileys, lastMessage não existe direto, mas existe unreadCount etc.
                                // Vamos ignorar update de lastMessage complexo aqui, focar no básico.
                            }
                            importedCount++;
                        } catch (err) {
                            // Silenciar
                        }
                    }
                    this.logger.log(`📜 ${importedCount} conversas importadas do histórico`);
                }
            });

        } catch (error: any) {
            this.logger.error(`❌ Erro ao conectar sessão ${session.name}: ${error.message}`);
            this.sessions.delete(sessionId);

            await this.prisma.whatsAppSession.update({
                where: { id: sessionId },
                data: { status: SessionStatus.ERROR },
            });

            throw error;
        }
    }

    // ── PROCESSAR MENSAGEM RECEBIDA ───────────────────────────

    /**
     * Processa uma mensagem recebida do WhatsApp via Baileys.
     * 
     * Fluxo completo:
     * 1. Extrai telefone do JID
     * 2. FindOrCreate contato (ContactsService)
     * 3. FindOrCreate conversa (ConversationsService) 
     * 4. Persiste mensagem (MessagesService)
     * 5. Atualiza lastMessage/unreadCount na conversa
     * 6. Emite evento realtime via Socket.io (Gateway)
     */
    private async handleIncomingMessage(sessionId: string, msg: any): Promise<void> {
        const remoteJid = msg.key.remoteJid!;
        const phone = remoteJid.split('@')[0];
        const fromMe = msg.key.fromMe || false;

        // Extrair conteúdo da mensagem
        const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            '';

        const messageType = Object.keys(msg.message || {})[0] || 'unknown';

        this.logger.log(
            `📩 [${sessionId}] ${fromMe ? 'Enviada' : 'Recebida'} de ${phone}: ${text?.substring(0, 50) || `[${messageType}]`}`,
        );

        // ── Download de mídia (stickers, imagens, etc) ────────
        let mediaUrl: string | undefined;
        const mediaTypes = ['stickerMessage', 'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];

        if (mediaTypes.includes(messageType)) {
            try {
                mediaUrl = await this.downloadAndSaveMedia(sessionId, msg, messageType);
            } catch (err: any) {
                this.logger.warn(`⚠️ Erro ao baixar mídia (${messageType}): ${err.message}`);
            }
        }

        // 1. FindOrCreate contato
        // IMPORTANTE: Quando fromMe=true, pushName é o nome do PRÓPRIO usuário,
        // NÃO do destinatário. Só usar pushName para contato quando fromMe=false.
        const contactName = fromMe ? undefined : (msg.pushName || undefined);
        const contact = await this.contactsService.findOrCreateByPhone(
            phone,
            contactName,
        );

        // Atualizar nome do contato APENAS se é mensagem RECEBIDA e temos pushName
        if (!fromMe && !contact.name && msg.pushName) {
            await this.prisma.contact.update({
                where: { id: contact.id },
                data: { name: msg.pushName },
            });
            contact.name = msg.pushName;
        }

        // 2. FindOrCreate conversa
        const conversation = await this.conversationsService.findOrCreate(
            sessionId,
            contact.id,
        );

        // 3. Persistir mensagem no banco (com mediaUrl se houver)
        const savedMessage = await this.messagesService.create({
            conversationId: conversation.id,
            sessionId,
            contactId: contact.id,
            type: this.mapMessageType(messageType),
            content: text || undefined,
            mediaUrl,
            fromMe,
            whatsappId: msg.key.id,
            status: fromMe ? MessageStatus.SENT : MessageStatus.DELIVERED,
        });

        // 4. Atualizar conversa (lastMessage + unreadCount)
        const displayText = text || (messageType === 'stickerMessage' ? '🏷️ Figurinha' : `[${messageType}]`);
        await this.conversationsService.updateLastMessage(conversation.id, displayText);

        if (!fromMe) {
            await this.conversationsService.incrementUnread(conversation.id);
        }

        // 5. Emitir evento realtime para o frontend
        this.gateway.emitNewMessage({
            sessionId,
            conversationId: conversation.id,
            contactId: contact.id,
            contact: {
                id: contact.id,
                name: contact.name,
                phone: contact.phone,
            },
            message: {
                id: savedMessage.id,
                content: text,
                type: messageType,
                fromMe,
                timestamp: savedMessage.timestamp,
                whatsappId: msg.key.id,
                mediaUrl,
                status: savedMessage.status,
            },
        });
    }

    /**
     * Mapeia tipo de mensagem do Baileys para o enum do Prisma.
     */
    private mapMessageType(baileyType: string): MessageType {
        const map: Record<string, MessageType> = {
            conversation: MessageType.TEXT,
            extendedTextMessage: MessageType.TEXT,
            imageMessage: MessageType.IMAGE,
            videoMessage: MessageType.VIDEO,
            audioMessage: MessageType.AUDIO,
            documentMessage: MessageType.DOCUMENT,
            stickerMessage: MessageType.STICKER,
            locationMessage: MessageType.LOCATION,
            contactMessage: MessageType.CONTACT,
        };
        return map[baileyType] || MessageType.TEXT;
    }

    // ── DOWNLOAD DE MÍDIA (STICKERS, IMAGENS, ETC) ────────────

    /**
     * Baixa mídia (sticker, imagem, vídeo, etc) da mensagem do Baileys
     * e salva no disco. Retorna a URL relativa para acessar o arquivo.
     */
    private async downloadAndSaveMedia(sessionId: string, msg: any, messageType: string): Promise<string | undefined> {
        try {
            // Download do buffer via Baileys
            const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
            );

            if (!buffer || (buffer as Buffer).length === 0) {
                this.logger.warn(`⚠️ Buffer vazio para mídia ${messageType}`);
                return undefined;
            }

            // Determinar extensão e subpasta
            const extMap: Record<string, string> = {
                stickerMessage: '.webp',
                imageMessage: '.jpg',
                videoMessage: '.mp4',
                audioMessage: '.ogg',
                documentMessage: '.bin',
            };
            const folderMap: Record<string, string> = {
                stickerMessage: 'stickers',
                imageMessage: 'images',
                videoMessage: 'videos',
                audioMessage: 'audios',
                documentMessage: 'documents',
            };

            const ext = extMap[messageType] || '.bin';
            const folder = folderMap[messageType] || 'misc';
            const fileName = `${msg.key.id || Date.now()}${ext}`;
            const subDir = path.join(this.mediaBaseDir, folder);

            if (!fs.existsSync(subDir)) {
                fs.mkdirSync(subDir, { recursive: true });
            }

            const filePath = path.join(subDir, fileName);
            fs.writeFileSync(filePath, buffer as Buffer);

            // URL relativa para servir via /media/
            const mediaUrl = `/media/${folder}/${fileName}`;
            this.logger.log(`📎 Mídia salva: ${mediaUrl} (${((buffer as Buffer).length / 1024).toFixed(1)}KB)`);

            return mediaUrl;
        } catch (error: any) {
            this.logger.error(`❌ Falha ao baixar mídia: ${error.message}`);
            return undefined;
        }
    }

    // ── ENVIAR READ RECEIPT (MARCAR COMO LIDO NO WHATSAPP) ────

    /**
     * Envia read receipt para o WhatsApp, marcando as mensagens como lidas.
     */
    async markAsReadOnWhatsApp(sessionId: string, conversationId: string): Promise<void> {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData?.socket) {
            this.logger.warn(`⚠️ Sessão ${sessionId} não está ativa para enviar read receipt`);
            return;
        }

        try {
            // Buscar conversa com contato
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: conversationId },
                include: { contact: true },
            });

            if (!conversation) {
                this.logger.warn(`⚠️ Conversa ${conversationId} não encontrada para read receipt`);
                return;
            }

            // Buscar últimas mensagens recebidas (não fromMe) com status != READ
            const unreadMessages = await this.prisma.message.findMany({
                where: {
                    conversationId,
                    fromMe: false,
                    status: { not: MessageStatus.READ },
                },
                orderBy: { timestamp: 'desc' },
                take: 100,
            });

            this.logger.log(`👁️ Conversa ${conversationId}: ${unreadMessages.length} mensagens não lidas encontradas`);

            if (unreadMessages.length === 0) return;

            // Filtrar apenas as que têm whatsappId para enviar read receipt
            const withWhatsappId = unreadMessages.filter((m) => m.whatsappId);

            if (withWhatsappId.length > 0) {
                // Construir JID do contato
                const jid = `${conversation.contact.phone}@s.whatsapp.net`;

                // Enviar read receipt via Baileys
                const keys = withWhatsappId.map((m) => ({
                    remoteJid: jid,
                    id: m.whatsappId!,
                    fromMe: false,
                }));

                try {
                    await sessionData.socket.readMessages(keys);
                    this.logger.log(`👁️ Read receipt enviado via Baileys para ${jid}: ${keys.length} mensagens`);
                } catch (readErr: any) {
                    this.logger.warn(`⚠️ Erro ao enviar read receipt via Baileys: ${readErr.message}`);
                }
            }

            // Atualizar TODAS as mensagens no banco para READ
            await this.prisma.message.updateMany({
                where: {
                    id: { in: unreadMessages.map((m) => m.id) },
                },
                data: { status: MessageStatus.READ },
            });

            // Emitir status update para o frontend
            for (const msg of unreadMessages) {
                this.gateway.emitMessageStatusUpdate({
                    sessionId,
                    messageId: msg.id,
                    status: 'READ',
                });
            }
        } catch (error: any) {
            this.logger.error(`❌ Erro ao enviar read receipt: ${error.message}`);
        }
    }

    // ── SINCRONIZAR CONTATOS ──────────────────────────────────

    async syncContactsForSession(sessionId: string): Promise<void> {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData?.socket) {
            throw new Error(`Sessão ${sessionId} não está conectada`);
        }
        await this.syncContacts(sessionId, sessionData.socket);
    }

    /**
     * Sincroniza contatos do WhatsApp conectado para o CRM.
     * Pode ser chamado manualmente ou automaticamente.
     */
    private async syncContacts(sessionId: string, sock: WASocket): Promise<void> {
        this.logger.log(`📇 Iniciando sync de contatos para sessão ${sessionId}...`);

        try {
            // Usar o Store global relendo do arquivo/memória
            if (!this.store) {
                this.logger.warn('⚠️ Store não inicializado');
                return;
            }

            const contacts = Object.values(this.store.contacts) as any[];
            this.logger.log(`📇 ${contacts.length} contatos encontrados no store persistente`);

            for (const contact of contacts) {
                if (!contact.id || contact.id === 'status@broadcast') continue;

                const phone = contact.id.split('@')[0];
                const name = contact.notify || contact.name || undefined;

                try {
                    await this.contactsService.findOrCreateByPhone(phone, name);
                } catch (err) {
                    // Silenciar
                }
            }
        } catch (error: any) {
            this.logger.warn(`⚠️ Sync de contatos falhou: ${error.message}`);
        }
    }

    // ── BUSCAR GRUPOS ─────────────────────────────────────────

    private async fetchGroups(sessionId: string, sock: WASocket): Promise<void> {
        this.logger.log('👥 Buscando grupos participando...');
        try {
            const groups = await sock.groupFetchAllParticipating();
            const groupIds = Object.keys(groups);
            this.logger.log(`👥 ${groupIds.length} grupos encontrados.`);

            for (const groupId of groupIds) {
                const group = groups[groupId];
                const phone = groupId.split('@')[0];

                try {
                    const contact = await this.contactsService.findOrCreateByPhone(
                        phone,
                        group.subject
                    );

                    if (group.subject && contact.name !== group.subject) {
                        await this.prisma.contact.update({
                            where: { id: contact.id },
                            data: { name: group.subject },
                        });
                    }

                    await this.conversationsService.findOrCreate(sessionId, contact.id);

                } catch (e) {
                    this.logger.warn(`⚠️ Erro ao processar grupo ${groupId}: ${e}`);
                }
            }
        } catch (error) {
            this.logger.error(`❌ Erro ao buscar grupos: ${error}`);
        }
    }

    /**
     * Tenta buscar histórico ativo do Store e persistir no banco.
     */
    async fetchActiveHistory(sessionId: string): Promise<void> {
        this.logger.log(`📜 Iniciando fetch ativo de histórico para sessão ${sessionId}...`);

        if (!this.store) return;

        try {
            const chats = Object.values(this.store.chats) as any[];
            this.logger.log(`📜 ${chats.length} chats encontrados no store.`);

            for (const chat of chats) {
                if (!chat.id || chat.id === 'status@broadcast') continue;

                const phone = chat.id.split('@')[0];
                const contact = await this.contactsService.findOrCreateByPhone(phone, chat.name || undefined);
                // Previne erro ao vincular conversa
                if (contact) {
                    const conversation = await this.conversationsService.findOrCreate(sessionId, contact.id);

                    const messagesKeyedDB = this.store.messages;
                    // @ts-ignore
                    const msgs = messagesKeyedDB[chat.id]?.array || [];

                    if (msgs.length > 0) {
                        this.logger.log(`📜 Processando ${msgs.length} mensagens recuperadas para ${chat.id}`);
                        for (const msg of msgs) {
                            try {
                                await this.handleIncomingMessage(sessionId, msg);
                            } catch (e) {
                                // Ignora duplicados ou erros
                            }
                        }
                    }
                }
            }
            this.logger.log('✅ Fetch de histórico concluído.');

        } catch (error: any) {
            this.logger.error(`❌ Erro no fetch active history: ${error.message}`);
        }
    }

    // ── DESCONECTAR SESSÃO ────────────────────────────────────

    async disconnectSession(sessionId: string): Promise<void> {
        const sessionData = this.sessions.get(sessionId);

        if (sessionData?.socket) {
            try {
                sessionData.socket.end(undefined);
            } catch (error) {
                this.logger.warn(`⚠️ Erro ao desconectar socket da sessão ${sessionId}: ${error}`);
            }
        }

        this.sessions.delete(sessionId);

        try {
            await this.prisma.whatsAppSession.update({
                where: { id: sessionId },
                data: {
                    status: SessionStatus.DISCONNECTED,
                    qrCode: null,
                },
            });
        } catch (error) {
            this.logger.warn(`⚠️ Erro ao atualizar status da sessão ${sessionId}: ${error}`);
        }

        this.logger.log(`🔌 Sessão ${sessionId} desconectada`);
    }

    // ── LISTAR SESSÕES ────────────────────────────────────────

    async listSessions(): Promise<any[]> {
        return this.prisma.whatsAppSession.findMany({
            select: {
                id: true,
                name: true,
                phone: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ── ENVIAR MENSAGEM ───────────────────────────────────────

    async sendMessage(
        sessionId: string,
        jid: string,
        content: { text?: string; caption?: string; mediaUrl?: string },
    ): Promise<any> {
        const sessionData = this.sessions.get(sessionId);

        if (!sessionData?.socket) {
            throw new Error(`Sessão ${sessionId} não está ativa`);
        }

        let msgPayload: any = {};
        const { text, caption, mediaUrl } = content;

        if (mediaUrl) {
            try {
                // Resolver caminho: /media/uploads/x.jpg -> .../media/uploads/x.jpg
                const cleanPath = mediaUrl.startsWith('/') ? mediaUrl.slice(1) : mediaUrl;
                const absolutePath = path.resolve(process.cwd(), cleanPath);

                if (fs.existsSync(absolutePath)) {
                    const buffer = fs.readFileSync(absolutePath);
                    const ext = path.extname(absolutePath).toLowerCase();
                    const finalCaption = caption || text || '';

                    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                        msgPayload = { image: buffer, caption: finalCaption };
                    } else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
                        msgPayload = { video: buffer, caption: finalCaption };
                    } else if (['.mp3', '.ogg', '.wav'].includes(ext)) {
                        // Enviando como áudio (não PTT por enquanto)
                        msgPayload = { audio: buffer, mimetype: 'audio/mp4' };
                    } else {
                        msgPayload = {
                            document: buffer,
                            mimetype: 'application/octet-stream',
                            fileName: path.basename(absolutePath),
                            caption: finalCaption
                        };
                    }
                    this.logger.log(`📎 Preparando envio de mídia: ${absolutePath}`);
                } else {
                    this.logger.warn(`⚠️ Arquivo local não encontrado: ${absolutePath}`);
                    msgPayload = { text: `[Erro: Mídia não encontrada] ${text || ''}` };
                }
            } catch (e: any) {
                this.logger.error(`❌ Erro ao ler arquivo para envio: ${e.message}`);
                msgPayload = { text: `[Erro de Mídia] ${text || ''}` };
            }
        } else {
            msgPayload = { text: text || '' };
        }

        // Envio real via Baileys
        const msg = await sessionData.socket.sendMessage(jid, msgPayload);

        // Persistir mensagem enviada no banco
        const phone = jid.split('@')[0];
        const contact = await this.contactsService.findOrCreateByPhone(phone);
        const conversation = await this.conversationsService.findOrCreate(sessionId, contact.id);

        // Determinar tipo para o banco
        let dbType: MessageType = MessageType.TEXT;
        if (msgPayload.image) dbType = MessageType.IMAGE;
        else if (msgPayload.video) dbType = MessageType.VIDEO;
        else if (msgPayload.audio) dbType = MessageType.AUDIO;
        else if (msgPayload.document) dbType = MessageType.DOCUMENT;

        const savedMessage = await this.messagesService.create({
            conversationId: conversation.id,
            sessionId,
            contactId: contact.id,
            type: dbType,
            content: caption || text, // Se for mídia, content é o caption
            mediaUrl: mediaUrl, // Salvar URL do upload
            fromMe: true,
            whatsappId: msg?.key?.id || undefined,
            status: MessageStatus.SENT,
        });

        // Atualizar lastMessage da conversa
        await this.conversationsService.updateLastMessage(
            conversation.id,
            content.text || '[mídia]',
        );

        this.logger.log(`📤 Mensagem enviada via sessão ${sessionId} para ${jid}`);

        return {
            success: true,
            sessionId,
            jid,
            messageId: savedMessage.id,
            whatsappId: msg?.key?.id,
            timestamp: Date.now(),
        };
    }

    // ── DELETAR SESSÃO ────────────────────────────────────────

    async deleteSession(sessionId: string): Promise<void> {
        if (this.sessions.has(sessionId)) {
            await this.disconnectSession(sessionId);
        }

        const authDir = path.join(this.authBaseDir, sessionId);
        try {
            if (fs.existsSync(authDir)) {
                fs.rmSync(authDir, { recursive: true, force: true });
            }
        } catch (e) {
            this.logger.warn(`⚠️ Erro ao limpar auth de ${sessionId}: ${e}`);
        }

        // Remover mensagens vinculadas a esta sessão
        await this.prisma.message.deleteMany({
            where: { sessionId },
        });
        this.logger.log(`🗑️ Mensagens da sessão ${sessionId} removidas`);

        // Remover conversas vinculadas a esta sessão
        await this.prisma.conversation.deleteMany({
            where: { sessionId },
        });
        this.logger.log(`🗑️ Conversas da sessão ${sessionId} removidas`);

        await this.prisma.whatsAppSession.delete({
            where: { id: sessionId },
        });

        this.logger.log(`🗑️ Sessão ${sessionId} removida permanentemente`);
    }

    // ── STATUS ────────────────────────────────────────────────

    async getSessionStatus(sessionId: string) {
        const session = await this.prisma.whatsAppSession.findUnique({
            where: { id: sessionId },
            select: {
                id: true,
                name: true,
                phone: true,
                status: true,
                qrCode: true,
                updatedAt: true,
            },
        });

        if (!session) {
            throw new Error(`Sessão ${sessionId} não encontrada`);
        }

        const sessionData = this.sessions.get(sessionId);

        return {
            ...session,
            qrCode: sessionData?.qrDataUrl || session.qrCode,
            isActive: this.sessions.has(sessionId),
        };
    }

    isSessionActive(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }
}
