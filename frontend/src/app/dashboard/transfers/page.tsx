'use client';

// ============================================================
// Transferências — Fila de transferências pendentes
// ============================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { transfersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Transfer {
    id: string;
    status: string;
    reason?: string;
    note?: string;
    createdAt: string;
    conversation: {
        id: string;
        contact: { id: string; name?: string; phone: string };
    };
    fromUser: { id: string; name: string };
    toUser?: { id: string; name: string };
    toDepartment?: { id: string; name: string };
}

export default function TransfersPage() {
    const { user } = useAuth();
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { loadTransfers(); }, []);

    const loadTransfers = async () => {
        try {
            const data = await transfersApi.pending();
            setTransfers(data);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const handleAccept = async (id: string) => {
        try { await transfersApi.accept(id); loadTransfers(); }
        catch (err: any) { toast.error('Erro ao aceitar', { description: err.message }); }
    };

    const handleReject = async (id: string) => {
        try { await transfersApi.reject(id); loadTransfers(); }
        catch (err: any) { toast.error('Erro ao rejeitar', { description: err.message }); }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Transferências</h1>
                <p className="text-muted-foreground text-sm mt-1">Aceite ou rejeite transferências de conversas</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-[hsl(var(--whatsapp))] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : transfers.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--whatsapp))]/10 flex items-center justify-center mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--whatsapp))" strokeWidth="1.5" opacity="0.7">
                                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                        </div>
                        <p className="font-medium">Nenhuma transferência pendente</p>
                        <p className="text-sm mt-1">Novas transferências aparecerão aqui</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {transfers.map((transfer) => (
                        <Card key={transfer.id} className="animate-fade-in">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base">
                                            {transfer.conversation.contact.name || transfer.conversation.contact.phone}
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            De: <span className="font-medium">{transfer.fromUser.name}</span>
                                            {transfer.toUser && <> → Para: <span className="font-medium">{transfer.toUser.name}</span></>}
                                            {transfer.toDepartment && <> → Depto: <span className="font-medium">{transfer.toDepartment.name}</span></>}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[11px]">
                                        Pendente
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {transfer.reason && <p className="text-sm text-muted-foreground mb-3">Motivo: {transfer.reason}</p>}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">{formatDate(transfer.createdAt)}</span>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="destructive" onClick={() => handleReject(transfer.id)} className="text-xs h-7">
                                            Rejeitar
                                        </Button>
                                        <Button size="sm" onClick={() => handleAccept(transfer.id)} className="bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white text-xs h-7">
                                            Aceitar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
