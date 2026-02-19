'use client';

// ============================================================
// Settings — Placeholder para configurações
// ============================================================

export default function SettingsPage() {
    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Configurações</h1>
                <p className="text-muted-foreground text-sm mt-1">Configurações do sistema</p>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg">
                <p className="font-medium">Em breve</p>
                <p className="text-sm mt-1">Configurações de perfil, notificações e integrações</p>
            </div>
        </div>
    );
}
