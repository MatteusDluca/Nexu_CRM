'use client';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/lib/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <TooltipProvider delayDuration={200}>
                {children}
                <Toaster position="top-right" richColors closeButton duration={4000} />
            </TooltipProvider>
        </AuthProvider>
    );
}
