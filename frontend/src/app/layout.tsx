import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'WhatsApp CRM — Multi-Atendente',
  description: 'Sistema CRM integrado ao WhatsApp para gerenciamento multi-atendente com filas, bots e transferências.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
