'use client';

// ============================================================
// Dashboard — Página principal de conversas (Chat Interface)
// Layout: Lista de conversas à esquerda + Chat à direita
// Suporte: Stickers, Read Receipts, Polling realtime
// ============================================================

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { conversationsApi, mediaApi, messagesApi, whatsappApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Paperclip, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ── URL base da API para servir mídia ─────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Conversation {
    id: string;
    status: string;
    lastMessage?: string;
    lastActivity: string;
    unreadCount: number;
    sessionId?: string;
    contact: { id: string; name?: string; phone: string; avatarUrl?: string };
    assignee?: { id: string; name: string };
    department?: { id: string; name: string };
    tags: { id: string; name: string; color: string }[];
}

interface Message {
    id: string;
    content?: string;
    type: string;
    fromMe: boolean;
    timestamp: string;
    status?: string;
    whatsappId?: string;
    mediaUrl?: string;
    caption?: string;
}

// ── Componente de marcas de status (✓ ✓✓ azul) ─────────────
function MessageStatus({ status, fromMe }: { status?: string; fromMe: boolean }) {
    if (!fromMe) return null;

    const getStatusContent = () => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="text-muted-foreground/50" title="Pendente">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
                        </svg>
                    </span>
                );
            case 'SENT':
                return (
                    <span className="text-muted-foreground/70" title="Enviada">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </span>
                );
            case 'DELIVERED':
                return (
                    <span className="text-muted-foreground/70" title="Entregue">
                        <svg width="16" height="14" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="24 6 13 17 8 12" />
                            <polyline points="16 6 5 17 1 13" />
                        </svg>
                    </span>
                );
            case 'READ':
                return (
                    <span className="text-[#53bdeb]" title="Lida">
                        <svg width="16" height="14" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="24 6 13 17 8 12" />
                            <polyline points="16 6 5 17 1 13" />
                        </svg>
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="text-destructive" title="Falha no envio">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    </span>
                );
            default:
                return (
                    <span className="text-muted-foreground/50" title="Enviando...">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </span>
                );
        }
    };

    return <span className="inline-flex items-center ml-1">{getStatusContent()}</span>;
}

// ── Componente de renderização de mensagem ─────────────────
function MessageBubble({ msg, formatTime }: { msg: Message; formatTime: (d: string) => string }) {
    const isSticker = msg.type === 'STICKER' || msg.type === 'stickerMessage';
    const isImage = msg.type === 'IMAGE' || msg.type === 'imageMessage';
    const isAudio = msg.type === 'AUDIO' || msg.type === 'audioMessage';
    const isVideo = msg.type === 'VIDEO' || msg.type === 'videoMessage';

    // Construir URL completa para mídia
    const fullMediaUrl = msg.mediaUrl
        ? (msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `${API_BASE}${msg.mediaUrl}`)
        : undefined;

    // ── STICKER: Render sem bolha, apenas a imagem ──────────
    if (isSticker && fullMediaUrl) {
        return (
            <div className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[200px]">
                    <img
                        src={fullMediaUrl}
                        alt="Figurinha"
                        className="w-36 h-36 object-contain rounded-lg drop-shadow-md hover:scale-105 transition-transform cursor-pointer"
                        loading="lazy"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = `
                                <div class="w-36 h-36 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground text-sm">
                                    🏷️ Figurinha
                                </div>
                            `;
                        }}
                    />
                    <div className={`flex items-center gap-1 mt-0.5 ${msg.fromMe ? 'justify-end' : ''}`}>
                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                        <MessageStatus status={msg.status} fromMe={msg.fromMe} />
                    </div>
                </div>
            </div>
        );
    }

    // ── IMAGEM: Com preview ─────────────────────────────────
    if (isImage && fullMediaUrl) {
        return (
            <div className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                <div
                    className={`max-w-[65%] rounded-2xl overflow-hidden ${msg.fromMe
                        ? 'bg-[hsl(var(--whatsapp))]/20 rounded-br-md'
                        : 'bg-card border border-border rounded-bl-md'
                        }`}
                >
                    <img
                        src={fullMediaUrl}
                        alt="Imagem"
                        className="max-w-full rounded-t-2xl cursor-pointer hover:opacity-90 transition-opacity"
                        loading="lazy"
                        onClick={() => window.open(fullMediaUrl, '_blank')}
                    />
                    {(msg.content || msg.caption) && (
                        <p className="px-3 py-1.5 text-sm whitespace-pre-wrap break-words">
                            {msg.content || msg.caption}
                        </p>
                    )}
                    <div className={`flex items-center gap-1 px-3 py-1 ${msg.fromMe ? 'justify-end' : ''}`}>
                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                        <MessageStatus status={msg.status} fromMe={msg.fromMe} />
                    </div>
                </div>
            </div>
        );
    }

    // ── ÁUDIO: Com player ────────────────────────────────────
    if (isAudio && fullMediaUrl) {
        return (
            <div className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                <div
                    className={`max-w-[65%] rounded-2xl px-3 py-2 ${msg.fromMe
                        ? 'bg-[hsl(var(--whatsapp))]/20 rounded-br-md'
                        : 'bg-card border border-border rounded-bl-md'
                        }`}
                >
                    <audio controls className="max-w-full" preload="none">
                        <source src={fullMediaUrl} type="audio/ogg" />
                        Seu navegador não suporta áudio.
                    </audio>
                    <div className={`flex items-center gap-1 mt-1 ${msg.fromMe ? 'justify-end' : ''}`}>
                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                        <MessageStatus status={msg.status} fromMe={msg.fromMe} />
                    </div>
                </div>
            </div>
        );
    }

    // ── VÍDEO: Com player ────────────────────────────────────
    if (isVideo && fullMediaUrl) {
        return (
            <div className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                <div
                    className={`max-w-[65%] rounded-2xl overflow-hidden ${msg.fromMe
                        ? 'bg-[hsl(var(--whatsapp))]/20 rounded-br-md'
                        : 'bg-card border border-border rounded-bl-md'
                        }`}
                >
                    <video controls className="max-w-full rounded-t-2xl" preload="none">
                        <source src={fullMediaUrl} type="video/mp4" />
                    </video>
                    {msg.content && (
                        <p className="px-3 py-1.5 text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                    <div className={`flex items-center gap-1 px-3 py-1 ${msg.fromMe ? 'justify-end' : ''}`}>
                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                        <MessageStatus status={msg.status} fromMe={msg.fromMe} />
                    </div>
                </div>
            </div>
        );
    }

    // ── TEXTO: Bolha padrão ─────────────────────────────────
    return (
        <div className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[65%] rounded-2xl px-3 py-2 text-sm ${msg.fromMe
                    ? 'bg-[hsl(var(--whatsapp))]/20 text-foreground rounded-br-md'
                    : 'bg-card border border-border rounded-bl-md'
                    }`}
            >
                <p className="whitespace-pre-wrap break-words">{msg.content || '[mensagem]'}</p>
                <div className={`flex items-center gap-1 mt-1 ${msg.fromMe ? 'justify-end' : ''}`}>
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                    <MessageStatus status={msg.status} fromMe={msg.fromMe} />
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const convPollingRef = useRef<NodeJS.Timeout | null>(null);
    const msgPollingRef = useRef<NodeJS.Timeout | null>(null);
    const selectedConvIdRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── CARREGAR CONVERSAS ────────────────────────────────────

    const loadConversations = useCallback(async () => {
        try {
            const filters: Record<string, string> = {};
            if (statusFilter !== 'all') filters.status = statusFilter;
            if (searchQuery) filters.search = searchQuery;
            const data = await conversationsApi.list(filters);
            setConversations(data);
        } catch (err) {
            console.error('Erro ao carregar conversas:', err);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, searchQuery]);

    // Carregar conversas no mount e quando filtros mudam
    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Polling de conversas a cada 5 segundos
    useEffect(() => {
        convPollingRef.current = setInterval(() => {
            loadConversations();
        }, 5000);

        return () => {
            if (convPollingRef.current) clearInterval(convPollingRef.current);
        };
    }, [loadConversations]);

    // ── CARREGAR MENSAGENS ────────────────────────────────────

    const loadMessages = useCallback(async (conversationId: string) => {
        try {
            const data = await messagesApi.list(conversationId);
            setMessages(data.reverse()); // API retorna desc, UI quer asc
        } catch (err) {
            console.error('Erro ao carregar mensagens:', err);
        }
    }, []);

    // Quando seleciona uma conversa, carrega mensagens + envia read receipt
    useEffect(() => {
        if (!selectedConv) {
            selectedConvIdRef.current = null;
            return;
        }

        selectedConvIdRef.current = selectedConv.id;
        loadMessages(selectedConv.id);

        // Marcar como lido no CRM
        conversationsApi.markAsRead(selectedConv.id).catch(() => { });

        // Enviar read receipt via WhatsApp (✓✓ azul para o remetente)
        if (selectedConv.sessionId) {
            whatsappApi.sendReadReceipt(selectedConv.sessionId, selectedConv.id).catch(() => { });
        }

        // Atualizar localmente o unreadCount
        setConversations((prev) =>
            prev.map((c) => c.id === selectedConv.id ? { ...c, unreadCount: 0 } : c)
        );
    }, [selectedConv?.id, loadMessages]);

    // Polling de mensagens a cada 3 segundos quando conversa selecionada
    useEffect(() => {
        if (msgPollingRef.current) clearInterval(msgPollingRef.current);

        if (selectedConv) {
            msgPollingRef.current = setInterval(() => {
                if (selectedConvIdRef.current) {
                    loadMessages(selectedConvIdRef.current);
                }
            }, 3000);
        }

        return () => {
            if (msgPollingRef.current) clearInterval(msgPollingRef.current);
        };
    }, [selectedConv?.id, loadMessages]);

    // Auto-scroll para última mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── ENVIAR MENSAGEM ───────────────────────────────────────

    const handleSendMessage = async () => {
        if (!messageText.trim() || !selectedConv || isSending) return;

        const text = messageText.trim();
        setMessageText('');
        setIsSending(true);

        try {
            if (!selectedConv.sessionId) {
                toast.error('Sessão WhatsApp não associada a esta conversa');
                setIsSending(false);
                return;
            }

            const jid = `${selectedConv.contact.phone}@s.whatsapp.net`;
            await whatsappApi.sendMessage(selectedConv.sessionId, jid, { text });
            await loadMessages(selectedConv.id);
            loadConversations();
        } catch (err: any) {
            toast.error('Erro ao enviar mensagem', { description: err.message });
            setMessageText(text);
        } finally {
            setIsSending(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedConv || !selectedConv.sessionId) return;

        setIsUploading(true);
        try {
            const { url, filename } = await mediaApi.upload(file);
            const jid = `${selectedConv.contact.phone}@s.whatsapp.net`;

            await whatsappApi.sendMessage(selectedConv.sessionId, jid, {
                caption: filename,
                mediaUrl: url
            });

            await loadMessages(selectedConv.id);
            loadConversations();
            toast.success('Mídia enviada com sucesso');
        } catch (err) {
            toast.error('Erro ao enviar mídia');
            console.error(err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Ontem ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
            ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    // ── SYNC MANUAL DE CONTATOS ───────────────────────────────

    const handleSyncContacts = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        toast.info('Iniciando sincronização de contatos...');

        try {
            const sessions = await whatsappApi.listSessions();
            const connected = sessions.filter((s: any) => s.status === 'CONNECTED');

            if (connected.length === 0) {
                toast.warning('Nenhuma sessão conectada para sincronizar.');
                return;
            }

            await Promise.all(connected.map((s: any) => whatsappApi.syncContacts(s.id)));
            toast.success(`Sincronização iniciada para ${connected.length} sessões.`);
        } catch (error) {
            toast.error('Erro ao sincronizar contatos');
        } finally {
            setTimeout(() => setIsSyncing(false), 3000);
        }
    };

    const filteredConversations = conversations.filter((conv) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            conv.contact?.name?.toLowerCase().includes(q) ||
            conv.contact?.phone?.includes(q) ||
            conv.lastMessage?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="flex h-full">
            {/* ── Lista de Conversas ─────────────────────────────── */}
            <div className="w-[var(--sidebar-width)] border-r border-border flex flex-col bg-card shrink-0">
                {/* Header */}
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Conversas</h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleSyncContacts}
                                disabled={isSyncing}
                                title="Sincronizar Contatos"
                                className="h-6 w-6"
                            >
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            </Button>
                            {conversations.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                    {conversations.length}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Input
                        placeholder="Buscar conversas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-secondary/50 h-9"
                    />
                    <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                        <TabsList className="grid w-full grid-cols-3 h-8">
                            <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
                            <TabsTrigger value="OPEN" className="text-xs">Abertas</TabsTrigger>
                            <TabsTrigger value="PENDING" className="text-xs">Pendentes</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <Separator />

                {/* Lista */}
                <ScrollArea className="flex-1 scrollbar-thin">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-[hsl(var(--whatsapp))] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            <p>Nenhuma conversa encontrada</p>
                            <p className="text-xs mt-1">As conversas aparecerão aqui quando o WhatsApp receber mensagens</p>
                        </div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedConv(conv)}
                                className={`w-full flex items-start gap-3 p-3 hover:bg-secondary/50 transition-colors text-left ${selectedConv?.id === conv.id ? 'bg-secondary' : ''
                                    }`}
                            >
                                <Avatar className="w-10 h-10 shrink-0">
                                    <AvatarFallback className="bg-[hsl(var(--whatsapp))]/20 text-[hsl(var(--whatsapp))] text-sm font-bold">
                                        {conv.contact?.id?.endsWith('@g.us') ? (
                                            <Users className="h-5 w-5" />
                                        ) : (
                                            conv.contact?.name?.charAt(0)?.toUpperCase() || conv.contact?.phone?.charAt(0) || '?'
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm truncate">
                                            {conv.contact?.name || conv.contact?.phone}
                                        </span>
                                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                            {formatTime(conv.lastActivity)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-0.5">
                                        <p className="text-xs text-muted-foreground truncate">
                                            {conv.lastMessage || 'Sem mensagens'}
                                        </p>
                                        {conv.unreadCount > 0 && (
                                            <Badge className="bg-[hsl(var(--whatsapp))] text-white text-[10px] h-4 min-w-4 px-1 ml-2">
                                                {conv.unreadCount}
                                            </Badge>
                                        )}
                                    </div>
                                    {conv.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                            {conv.tags.slice(0, 2).map((tag) => (
                                                <Badge key={tag.id} variant="outline" className="text-[10px] h-4 px-1" style={{ borderColor: tag.color, color: tag.color }}>
                                                    {tag.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </ScrollArea>
            </div>

            {/* ── Área de Chat ──────────────────────────────────── */}
            <div className="flex-1 flex flex-col">
                {selectedConv ? (
                    <>
                        {/* Header do Chat */}
                        <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-card shrink-0">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9">
                                    <AvatarFallback className="bg-[hsl(var(--whatsapp))]/20 text-[hsl(var(--whatsapp))] text-sm font-bold">
                                        {selectedConv.contact?.id?.endsWith('@g.us') ? (
                                            <Users className="h-4 w-4" />
                                        ) : (
                                            selectedConv.contact?.name?.charAt(0)?.toUpperCase() || '?'
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-sm font-semibold">{selectedConv.contact?.name || selectedConv.contact?.phone}</h3>
                                    <p className="text-xs text-muted-foreground">{selectedConv.contact?.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs capitalize">
                                    {selectedConv.status.toLowerCase()}
                                </Badge>
                                {selectedConv.assignee && (
                                    <Badge variant="secondary" className="text-xs">
                                        👤 {selectedConv.assignee.name}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Mensagens */}
                        <ScrollArea className="flex-1 p-4 scrollbar-thin">
                            <div className="max-w-3xl mx-auto space-y-2">
                                {messages.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground text-sm">
                                        <p>Nenhuma mensagem ainda</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <MessageBubble key={msg.id} msg={msg} formatTime={formatTime} />
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Input de Mensagem */}
                        <div className="p-3 border-t border-border bg-card shrink-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileUpload}
                                accept="image/*,video/*,audio/*,application/pdf"
                            />
                            <div className="max-w-3xl mx-auto flex gap-2 items-end">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isSending || isUploading}
                                    title="Anexar mídia"
                                >
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                                <Textarea
                                    placeholder="Digite uma mensagem..."
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    className="bg-secondary/50 min-h-[40px] max-h-32 resize-none"
                                    disabled={isSending || isUploading}
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={(!messageText.trim() && !isUploading) || isSending}
                                    className="bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white h-10 w-10 p-0 shrink-0"
                                >
                                    {isSending || isUploading ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                        </svg>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Estado vazio — nenhuma conversa selecionada */
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-24 h-24 rounded-3xl bg-[hsl(var(--whatsapp))]/10 flex items-center justify-center mb-6">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--whatsapp))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">WhatsApp CRM</h3>
                        <p className="text-sm text-center max-w-xs">
                            Selecione uma conversa para começar a atender ou envie uma mensagem para alguém.
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-2">
                            Conversas novas aparecem automaticamente via WhatsApp
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
