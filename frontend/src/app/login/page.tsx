'use client';

// ============================================================
// Página de Login — Tela de autenticação do WhatsApp CRM
// Design: Dark mode com gradiente verde WhatsApp
// ============================================================

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
    const router = useRouter();
    const { login, register, error } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // ── Login ──────────────────────────────────────────────────
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // ── Register ───────────────────────────────────────────────
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(loginEmail, loginPassword);
            router.push('/dashboard');
        } catch {
            // Erro já tratado no context
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await register(regName, regEmail, regPassword);
            router.push('/dashboard');
        } catch {
            // Erro já tratado no context
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(142,70%,15%)] via-background to-background" />
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[hsl(var(--whatsapp))] opacity-5 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[hsl(var(--whatsapp))] opacity-5 blur-3xl" />

            <Card className="w-full max-w-md mx-4 glass border-border/50 animate-fade-in relative z-10">
                <CardHeader className="text-center space-y-3">
                    {/* Logo WhatsApp CRM */}
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--whatsapp))] to-[hsl(var(--whatsapp-dark))] flex items-center justify-center shadow-lg shadow-[hsl(var(--whatsapp))]/20">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.174-3.01.79.8-2.94-.19-.3A7.96 7.96 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8z" />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">WhatsApp CRM</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Sistema multi-atendente para WhatsApp
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center animate-fade-in">
                            {error}
                        </div>
                    )}

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="login">Entrar</TabsTrigger>
                            <TabsTrigger value="register">Registrar</TabsTrigger>
                        </TabsList>

                        {/* ── Tab Login ───────────────────────────────── */}
                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-email">Email</Label>
                                    <Input
                                        id="login-email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        required
                                        className="bg-secondary/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password">Senha</Label>
                                    <Input
                                        id="login-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        required
                                        className="bg-secondary/50"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-[hsl(var(--whatsapp))]/25"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Entrando...' : 'Entrar'}
                                </Button>
                            </form>
                        </TabsContent>

                        {/* ── Tab Register ────────────────────────────── */}
                        <TabsContent value="register">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reg-name">Nome</Label>
                                    <Input
                                        id="reg-name"
                                        placeholder="Seu nome"
                                        value={regName}
                                        onChange={(e) => setRegName(e.target.value)}
                                        required
                                        className="bg-secondary/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-email">Email</Label>
                                    <Input
                                        id="reg-email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        required
                                        className="bg-secondary/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-password">Senha</Label>
                                    <Input
                                        id="reg-password"
                                        type="password"
                                        placeholder="Mínimo 6 caracteres"
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="bg-secondary/50"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp-dark))] text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-[hsl(var(--whatsapp))]/25"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Registrando...' : 'Criar conta'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
