'use client';

// ============================================================
// Sessões WhatsApp — Gerenciar conexões + QR Code display
// ============================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { whatsappApi } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Session {
    id: string;
    name: string;
    phone?: string;
    status: string;
    qrCode?: string;
    createdAt: string;
    updatedAt: string;
}

const statusColors: Record<string, string> = {
    CONNECTED: 'bg-green-500/20 text-green-400 border-green-500/30',
    CONNECTING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    QR_READY: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    DISCONNECTED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    ERROR: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels: Record<string, string> = {
    CONNECTED: '🟢 Conectada',
    CONNECTING: '🟡 Conectando...',
    QR_READY: '📷 QR Code',
    DISCONNECTED: '⚫ Desconectada',
    ERROR: '🔴 Erro',
};

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [sessionName, setSessionName] = useState('');
    const [qrSession, setQrSession] = useState<Session | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadSessions();
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const loadSessions = async () => {
        try {
            const data = await whatsappApi.listSessions();
            setSessions(data);
        } catch (err) {
            console.error('Erro ao carregar sessões:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!sessionName.trim()) return;
        try {
            await whatsappApi.createSession(sessionName);
            setSessionName('');
            setShowCreate(false);
            loadSessions();
            toast.success('Sessão criada! Clique "Conectar" para gerar o QR code.');
        } catch (err: any) {
            toast.error('Erro ao criar sessão', { description: err.message });
        }
    };

    /**
     * Conecta sessão e inicia polling de status para QR code.
     * O backend gera o QR via Baileys e salva no banco.
     * Frontend faz polling a cada 2s para receber o QR.
     */
    const handleConnect = async (session: Session) => {
        setIsConnecting(true);
        setQrSession(session);
        setQrCode(null);

        try {
            // Chama connect no backend (inicia Baileys)
            await whatsappApi.connectSession(session.id);

            // Inicia polling para buscar QR code e status
            startPolling(session.id);
        } catch (err: any) {
            toast.error('Erro ao conectar sessão', { description: err.message });
            setIsConnecting(false);
            setQrSession(null);
        }
    };

    const startPolling = (sessionId: string) => {
        // Limpar polling anterior
        if (pollingRef.current) clearInterval(pollingRef.current);

        // Polling a cada 2 segundos
        pollingRef.current = setInterval(async () => {
            try {
                const status = await whatsappApi.getSessionStatus(sessionId);

                // Se QR code disponível, mostrar
                if (status.qrCode) {
                    setQrCode(status.qrCode);
                }

                // Se conectou, parar polling
                if (status.status === 'CONNECTED') {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setQrSession(null);
                    setQrCode(null);
                    setIsConnecting(false);
                    toast.success(`✅ ${status.name} conectada!`, {
                        description: `Número: ${status.phone || 'Não identificado'}`,
                    });
                    loadSessions();
                }

                // Se erro, parar polling
                if (status.status === 'ERROR' || status.status === 'DISCONNECTED') {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setIsConnecting(false);
                    if (status.status === 'ERROR') {
                        toast.error('Erro na conexão', { description: 'Limite de QR code atingido ou falha.' });
                    }
                    setQrSession(null);
                    setQrCode(null);
                    loadSessions();
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 2000);
    };

    const handleDisconnect = async (id: string) => {
        try {
            await whatsappApi.disconnectSession(id);
            loadSessions();
            toast.success('Sessão desconectada');
        } catch (err: any) {
            toast.error('Erro ao desconectar sessão', { description: err.message });
        }
    };

    const handleSyncContacts = async (id: string) => {
        try {
            await whatsappApi.syncContacts(id);
            toast.success('Sincronização iniciada', {
                description: 'Os nomes dos contatos serão atualizados em breve.',
            });
        } catch (err: any) {
            toast.error('Erro ao sincronizar', { description: err.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('⚠️ ATENÇÃO: Isso removerá TODAS as mensagens e contatos desta sessão do CRM!\n\nSe você quer apenas reconectar, use o botão "Desconectar".\n\nDeseja realmente apagar tudo?')) return;
        try {
            await whatsappApi.deleteSession(id);
            loadSessions();
            toast.success('Sessão removida');
        } catch (err: any) {
            toast.error('Erro ao remover sessão', { description: err.message });
        }
    };

    const closeQrDialog = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setQrSession(null);
        setQrCode(null);
        setIsConnecting(false);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Sessões WhatsApp</h1>
                    <p className="text-muted-foreground text-sm mt-1">Gerencie as conexões do WhatsApp</p>
                </div>
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogTrigger asChild>
                        <Button className="bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white">
                            + Nova Sessão
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Nova Sessão WhatsApp</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-4">
                            <Input placeholder="Nome da sessão (ex: Vendas, Suporte)" value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
                            <Button onClick={handleCreate} className="w-full bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white">Criar</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ── QR Code Dialog ────────────────────────────── */}
            <Dialog open={!!qrSession} onOpenChange={(open) => !open && closeQrDialog()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[hsl(var(--whatsapp))] animate-pulse" />
                            Conectando: {qrSession?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        {qrCode ? (
                            <>
                                <div className="p-4 bg-white rounded-2xl shadow-lg">
                                    <img
                                        src={qrCode}
                                        alt="QR Code WhatsApp"
                                        className="w-64 h-64"
                                    />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-sm font-medium">Escaneie com o WhatsApp</p>
                                    <p className="text-xs text-muted-foreground">
                                        Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-3 py-8">
                                <div className="w-8 h-8 border-3 border-[hsl(var(--whatsapp))] border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-muted-foreground">Gerando QR code...</p>
                                <p className="text-xs text-muted-foreground/60">Aguarde alguns segundos</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-[hsl(var(--whatsapp))] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : sessions.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--whatsapp))]/10 flex items-center justify-center mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--whatsapp))" strokeWidth="1.5" opacity="0.7">
                                <rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />
                            </svg>
                        </div>
                        <p className="font-medium">Nenhuma sessão configurada</p>
                        <p className="text-sm mt-1">Crie uma sessão para conectar ao WhatsApp</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {sessions.map((session) => (
                        <Card key={session.id} className="animate-fade-in">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base">{session.name}</CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            {session.phone || 'Não conectado'}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className={`text-[11px] ${statusColors[session.status] || ''}`}>
                                        {statusLabels[session.status] || session.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    {(session.status === 'DISCONNECTED' || session.status === 'ERROR') && (
                                        <Button size="sm" variant="outline" onClick={() => handleConnect(session)} className="text-xs">
                                            📷 Conectar
                                        </Button>
                                    )}
                                    {(session.status === 'CONNECTED' || session.status === 'QR_READY') && (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => handleSyncContacts(session.id)} className="text-xs" title="Atualizar nomes dos contatos">
                                                🔄 Sync Contatos
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleDisconnect(session.id)} className="text-xs">
                                                🔌 Desconectar
                                            </Button>
                                        </>
                                    )}
                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(session.id)} className="text-xs">
                                        Remover
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
