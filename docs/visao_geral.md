# Nexus CRM - Visão Geral do Projeto (Work in Progress)

**Desenvolvido por:** Matteus Dluca

## 🎯 Objetivo
O **Nexus CRM** é um sistema de gestão de atendimento via WhatsApp, projetado para centralizar múltiplas sessões do WhatsApp em uma única interface web moderna e intuitiva. O objetivo é permitir que empresas gerenciem conversas, automatizem fluxos e distribuam atendimentos entre equipes de suporte.

O projeto está em desenvolvimento ativo (`v0.1`), focado atualmente na estabilidade da conexão com o WhatsApp (via biblioteca Baileys) e na experiência básica de chat (envio/recebimento de mensagens e mídia).

## 🏗️ Arquitetura de Alto Nível
O sistema segue uma arquitetura baseada em microsserviços monolíticos (Modular Monolith) com comunicação em tempo real.

```mermaid
graph TD
    User[Usuário] --> Frontend[Frontend (Next.js)]
    Frontend --> API[Backend API (NestJS)]
    Frontend <--> Socket[Socket.io (Realtime)]
    API --> DB[(MongoDB + Prisma)]
    API --> Redis[(Redis + BullMQ)]
    API <--> Baileys[Baileys (WhatsApp Web API)]
    Baileys <--> WhatsAppServer[WhatsApp Servers]
```

### Componentes Principais
1.  **Frontend (Next.js 14)**: Interface do usuário construída com React, TailwindCSS e Shadcn/UI. Foca em performance e ux moderna.
2.  **Backend (NestJS 11)**: API RESTful e WebSocket Gateway. Gerencia a lógica de negócios, autenticação e a conexão persistente com o WhatsApp.
3.  **Database (MongoDB)**: Armazena usuários, contatos, mensagens e logs de sessão.
4.  **Queue (Redis + BullMQ)**: Gerencia filas de processamento assíncrono (envio de mensagens em massa, webhooks).
5.  **WhatsApp Engine (Baileys)**: Biblioteca core que simula uma conexão WebSocket do WhatsApp Web, permitindo controle programático sem depender da API oficial paga (Cloud API).

## 🚀 Features (Status Atual vs. Futuro)

| Feature | Status | Descrição |
| :--- | :---: | :--- |
| **Multi-Sessão** | ✅ Pronto | Conexão de múltiplos números via QR Code. |
| **Chat em Tempo Real** | ✅ Pronto | Envio e recebimento de mensagens sem refresh. |
| **Envio de Mídia** | ✅ Pronto | Suporte a Imagens, Vídeos e Áudio. |
| **Gestão de Contatos** | ✅ Pronto | Sincronização automática e manual com o celular. |
| **Persistência de Sessão** | ✅ Pronto | Reconexão automática sem necessidade de novo QR Code. |
| **Suporte a Grupos** | ✅ Pronto | Visualização e interação básica com grupos. |
| **Filas de Atendimento** | 🚧 Em Breve | Distribuição de conversas por departamentos. |
| **Bot Builder** | 🚧 Em Breve | Construtor visual de fluxos de automação. |
| **Dashboard de Métricas** | 🚧 Em Breve | Relatórios de tempo de resposta e volume. |
| **Sistema de Tags** | 🚧 Em Breve | Organização de conversas por etiquetas (Kanban). |

## 🛠️ Tecnologias Utilizadas
-   **Linguagem**: TypeScript (Fullstack)
-   **Backend**: NestJS, Prisma ORM, Socket.io, Multer
-   **Frontend**: Next.js (App Router), Lucide React, Sonner (Toasts)
-   **Infraestrutura**: Docker Compose (App, Mongo, Redis)
-   **WhatsApp**: @whiskeysockets/baileys

---
*Documentação gerada automaticamente para o repositório GitHub.*

## Documentação Técnica Detalhada
Para detalhes específicos de implementação, consulte:
- [⚙️ Backend Reference](backend/README.md)
- [💻 Frontend Reference](frontend/README.md)
