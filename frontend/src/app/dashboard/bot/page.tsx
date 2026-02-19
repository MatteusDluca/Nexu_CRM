'use client';

// ============================================================
// Bot Builder — Lista de fluxos de bot
// (Canvas React Flow será implementado futuramente)
// ============================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { botApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface BotFlow {
    id: string;
    name: string;
    description?: string;
    trigger?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function BotPage() {
    const [flows, setFlows] = useState<BotFlow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [flowName, setFlowName] = useState('');
    const [flowDescription, setFlowDescription] = useState('');
    const [flowTrigger, setFlowTrigger] = useState('');

    useEffect(() => { loadFlows(); }, []);

    const loadFlows = async () => {
        try { const data = await botApi.listFlows(); setFlows(data); }
        catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const handleCreate = async () => {
        if (!flowName.trim()) return;
        try {
            await botApi.createFlow({ name: flowName, description: flowDescription, trigger: flowTrigger || undefined });
            setFlowName(''); setFlowDescription(''); setFlowTrigger(''); setShowCreate(false);
            loadFlows();
        } catch (err: any) { toast.error('Erro ao criar fluxo', { description: err.message }); }
    };

    const handleToggle = async (id: string) => {
        try { await botApi.toggleFlow(id); loadFlows(); }
        catch (err: any) { toast.error('Erro ao alternar status', { description: err.message }); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remover este fluxo?')) return;
        try { await botApi.deleteFlow(id); loadFlows(); }
        catch (err: any) { toast.error('Erro ao remover fluxo', { description: err.message }); }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Builder</h1>
                    <p className="text-muted-foreground text-sm mt-1">Crie fluxos automatizados para atendimento</p>
                </div>
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogTrigger asChild>
                        <Button className="bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white">+ Novo Fluxo</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Novo Fluxo de Bot</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div><Label>Nome *</Label><Input placeholder="Nome do fluxo" value={flowName} onChange={(e) => setFlowName(e.target.value)} /></div>
                            <div><Label>Descrição</Label><Textarea placeholder="O que este bot faz..." value={flowDescription} onChange={(e) => setFlowDescription(e.target.value)} rows={2} /></div>
                            <div><Label>Trigger (palavra-chave)</Label><Input placeholder="Ex: menu, ajuda, oi" value={flowTrigger} onChange={(e) => setFlowTrigger(e.target.value)} /></div>
                            <Button onClick={handleCreate} className="w-full bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white">Criar Fluxo</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-[hsl(var(--whatsapp))] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : flows.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--whatsapp))]/10 flex items-center justify-center mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--whatsapp))" strokeWidth="1.5" opacity="0.7">
                                <rect width="18" height="10" x="3" y="11" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" />
                            </svg>
                        </div>
                        <p className="font-medium">Nenhum fluxo de bot criado</p>
                        <p className="text-sm mt-1">Crie um fluxo para automatizar o atendimento inicial</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {flows.map((flow) => (
                        <Card key={flow.id} className="animate-fade-in">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base">{flow.name}</CardTitle>
                                        {flow.description && <CardDescription className="text-xs mt-1">{flow.description}</CardDescription>}
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={`text-[11px] cursor-pointer ${flow.isActive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}
                                        onClick={() => handleToggle(flow.id)}
                                    >
                                        {flow.isActive ? '✅ Ativo' : '⏸️ Inativo'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                        {flow.trigger && <Badge variant="secondary" className="text-[10px]">Trigger: {flow.trigger}</Badge>}
                                        <span>{formatDate(flow.updatedAt)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="text-xs h-7" disabled>
                                            Editar ↗
                                        </Button>
                                        <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => handleDelete(flow.id)}>
                                            ✕
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Nota sobre React Flow */}
            <Card className="mt-8 bg-secondary/30 border-dashed">
                <CardContent className="py-4 text-center text-muted-foreground text-sm">
                    🔮 O editor visual com React Flow (drag-and-drop de nodes) será integrado em uma fase futura.
                    <br />Por enquanto, os fluxos são gerenciados via API.
                </CardContent>
            </Card>
        </div>
    );
}
