'use client';

// ============================================================
// Contatos CRM — Lista e gerenciamento de contatos
// ============================================================

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { contactsApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Contact {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    notes?: string;
    avatarUrl?: string;
    tags: { id: string; name: string; color: string }[];
    _count: { conversations: number };
    updatedAt: string;
}

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Form state
    const [formPhone, setFormPhone] = useState('');
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formNotes, setFormNotes] = useState('');

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        try {
            const data = await contactsApi.list(searchQuery || undefined);
            setContacts(data);
        } catch (err) {
            console.error('Erro ao carregar contatos:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => loadContacts(), 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleCreateContact = async () => {
        try {
            await contactsApi.create({ phone: formPhone, name: formName, email: formEmail, notes: formNotes });
            setShowCreateDialog(false);
            setFormPhone(''); setFormName(''); setFormEmail(''); setFormNotes('');
            loadContacts();
        } catch (err: any) {
            toast.error('Erro ao criar contato', { description: err.message });
        }
    };

    const handleDeleteContact = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este contato?')) return;
        try {
            await contactsApi.delete(id);
            if (selectedContact?.id === id) setSelectedContact(null);
            loadContacts();
        } catch (err: any) {
            toast.error('Erro ao remover contato', { description: err.message });
        }
    };

    return (
        <div className="flex h-full">
            {/* ── Lista de Contatos ──────────────────────────────── */}
            <div className="w-[var(--sidebar-width)] border-r border-border flex flex-col bg-card shrink-0">
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Contatos</h2>
                        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white h-8 text-xs">
                                    + Novo
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Novo Contato</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 mt-4">
                                    <div><Label>Telefone *</Label><Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="5511999998888" /></div>
                                    <div><Label>Nome</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome do contato" /></div>
                                    <div><Label>Email</Label><Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@contato.com" /></div>
                                    <div><Label>Notas</Label><Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Observações..." rows={3} /></div>
                                    <Button onClick={handleCreateContact} className="w-full bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white">
                                        Criar Contato
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <Input
                        placeholder="Buscar por nome, telefone, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-secondary/50 h-9"
                    />
                </div>

                <ScrollArea className="flex-1 scrollbar-thin">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-[hsl(var(--whatsapp))] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">Nenhum contato</div>
                    ) : (
                        contacts.map((contact) => (
                            <button
                                key={contact.id}
                                onClick={() => setSelectedContact(contact)}
                                className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left ${selectedContact?.id === contact.id ? 'bg-secondary' : ''
                                    }`}
                            >
                                <Avatar className="w-9 h-9 shrink-0">
                                    <AvatarFallback className="bg-[hsl(var(--whatsapp))]/20 text-[hsl(var(--whatsapp))] text-sm font-bold">
                                        {contact.name?.charAt(0)?.toUpperCase() || contact.phone?.charAt(0) || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <span className="font-medium text-sm truncate block">{contact.name || contact.phone}</span>
                                    <span className="text-xs text-muted-foreground truncate block">{contact.phone}</span>
                                </div>
                                <Badge variant="secondary" className="text-[10px] shrink-0">{contact._count.conversations}</Badge>
                            </button>
                        ))
                    )}
                </ScrollArea>
            </div>

            {/* ── Detalhe do Contato ─────────────────────────────── */}
            <div className="flex-1 p-6 overflow-auto">
                {selectedContact ? (
                    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarFallback className="bg-[hsl(var(--whatsapp))]/20 text-[hsl(var(--whatsapp))] text-2xl font-bold">
                                        {selectedContact.name?.charAt(0)?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-xl font-bold">{selectedContact.name || 'Sem nome'}</h2>
                                    <p className="text-muted-foreground">{selectedContact.phone}</p>
                                    {selectedContact.email && <p className="text-sm text-muted-foreground">{selectedContact.email}</p>}
                                </div>
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteContact(selectedContact.id)}>
                                Remover
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Conversas</CardTitle></CardHeader>
                                <CardContent><p className="text-2xl font-bold">{selectedContact._count.conversations}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tags</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedContact.tags.length > 0 ? selectedContact.tags.map((tag) => (
                                            <Badge key={tag.id} style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }} variant="outline" className="text-xs">
                                                {tag.name}
                                            </Badge>
                                        )) : <span className="text-sm text-muted-foreground">Nenhuma tag</span>}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {selectedContact.notes && (
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Notas</CardTitle></CardHeader>
                                <CardContent><p className="text-sm whitespace-pre-wrap">{selectedContact.notes}</p></CardContent>
                            </Card>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full">
                        <div className="w-20 h-20 rounded-3xl bg-[hsl(var(--whatsapp))]/10 flex items-center justify-center mb-4">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--whatsapp))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                            </svg>
                        </div>
                        <p className="text-sm">Selecione um contato para ver os detalhes</p>
                    </div>
                )}
            </div>
        </div>
    );
}
