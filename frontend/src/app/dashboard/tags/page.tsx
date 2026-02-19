'use client';

// ============================================================
// Tags — Gerenciamento de etiquetas (CRUD)
// ============================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { tagsApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Tag {
    id: string;
    name: string;
    color: string;
    _count: { contacts: number; conversations: number };
}

const presetColors = [
    '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState(presetColors[0]);

    useEffect(() => { loadTags(); }, []);

    const loadTags = async () => {
        try {
            const data = await tagsApi.list();
            setTags(data);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const handleCreate = async () => {
        if (!tagName.trim()) return;
        try {
            await tagsApi.create({ name: tagName, color: tagColor });
            setTagName(''); setTagColor(presetColors[0]); setShowCreate(false);
            loadTags();
        } catch (err: any) { toast.error('Erro ao criar tag', { description: err.message }); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remover esta tag?')) return;
        try { await tagsApi.delete(id); loadTags(); }
        catch (err: any) { toast.error('Erro ao remover tag', { description: err.message }); }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Etiquetas</h1>
                    <p className="text-muted-foreground text-sm mt-1">Organize conversas e contatos com tags</p>
                </div>
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogTrigger asChild>
                        <Button className="bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white">+ Nova Tag</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Nova Etiqueta</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-4">
                            <Input placeholder="Nome da tag" value={tagName} onChange={(e) => setTagName(e.target.value)} />
                            <div>
                                <p className="text-sm font-medium mb-2">Cor</p>
                                <div className="flex flex-wrap gap-2">
                                    {presetColors.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setTagColor(color)}
                                            className={`w-8 h-8 rounded-full transition-all ${tagColor === color ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Preview:</span>
                                <Badge style={{ backgroundColor: tagColor + '20', color: tagColor, borderColor: tagColor }} variant="outline">
                                    {tagName || 'Tag'}
                                </Badge>
                            </div>
                            <Button onClick={handleCreate} className="w-full bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white">Criar</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-[hsl(var(--whatsapp))] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : tags.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <p className="font-medium">Nenhuma etiqueta criada</p>
                        <p className="text-sm mt-1">Crie tags para organizar seus contatos e conversas</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tags.map((tag) => (
                        <Card key={tag.id} className="group animate-fade-in">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                                    <div>
                                        <p className="font-medium text-sm">{tag.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {tag._count.contacts} contatos · {tag._count.conversations} conversas
                                        </p>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive h-7 text-xs" onClick={() => handleDelete(tag.id)}>
                                    ✕
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
