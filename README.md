# Nexus CRM 🚀

> **Sistema de Gestão de Atendimento via WhatsApp Multi-Sessão**

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)

O **Nexus CRM** é uma plataforma open-source projetada para centralizar e gerenciar múltiplas contas de WhatsApp em uma única interface web. Ideal para pequenas e médias empresas que precisam organizar o atendimento ao cliente, automação e distribuição de conversas.

---

## 📚 Documentação
A documentação detalhada do projeto encontra-se na pasta `docs/`:

-   [🔭 Visão Geral e Roadmap](docs/visao_geral.md): Arquitetura, fluxo de dados e funcionalidades planejadas.
-   [⚙️ Referência Backend](docs/backend/README.md): Módulos Auth, Whatsapp, Messages e Media.
-   [💻 Referência Frontend](docs/frontend/README.md): Componentes, Hooks e API Client.

---

## ✨ Funcionalidades Principais

-   ✅ **Multi-Sessão**: Conecte múltiplos números de WhatsApp simultaneamente via QR Code.
-   ✅ **Chat em Tempo Real**: Interface moderna e responsiva para envio e recebimento de mensagens instantâneas.
-   ✅ **Envio de Mídia**: Suporte completo para envio de Imagens, Vídeos, Áudios e Documentos.
-   ✅ **Sincronização de Contatos**: Importação automática e manual de contatos do celular.
-   ✅ **Gestão de Grupos**: Visualização e interação com grupos do WhatsApp.
-   🚧 **Filas de Atendimento**: (Em Breve) Distribuição inteligente de chats por departamento.
-   🚧 **Bot Builder**: (Em Breve) Criação visual de fluxos de automação e pré-atendimento.

---

## 🛠️ Tech Stack

Este projeto utiliza tecnologias modernas e robustas para garantir performance e escalabilidade:

### Backend
-   **NestJS**: Framework Node.js progressivo e eficiente.
-   **Prisma ORM**: ORM moderno para Node.js e TypeScript (MongoDB).
-   **Socket.io**: Comunicação bidirecional em tempo real.
-   **Baileys**: Biblioteca core para conexão com WhatsApp Web API.
-   **Redis & BullMQ**: Gerenciamento de filas e cache.
-   **Docker**: Containerização completa da infraestrutura.

### Frontend
-   **Next.js 14**: Framework React para produção (App Router).
-   **React 18**: Biblioteca JavaScript para construção de interfaces.
-   **Shadcn/UI & TailwindCSS**: Design System acessível e customizável.
-   **Zustand / Context API**: Gerenciamento de estado global.

---

## 🚀 Como Executar (Localhost)

### Pré-requisitos
-   Node.js (v18+)
-   Docker & Docker Compose (Recomendado para O Banco e Redis)

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/nexus-crm.git
    cd nexus-crm
    ```

2.  **Inicie a Infraestrutura (MongoDB + Redis):**
    ```bash
    docker-compose up -d
    ```

3.  **Configure e Inicie o Backend:**
    ```bash
    cd backend
    cp .env.example .env  # Configure suas variáveis de ambiente
    npm install
    npx prisma generate
    npm run start:dev
    ```

4.  **Inicie o Frontend:**
    ```bash
    cd frontend
    cp .env.example .env.local
    npm install
    npm run dev
    ```

5.  **Acesse o Sistema:**
    Abra `http://localhost:3000` no seu navegador.

---

## 👨‍💻 Autor

**Desenvolvido por:** Matteus Dluca

Sinta-se à vontade para contribuir com o projeto enviando Pull Requests ou abrindo Issues!

---
*Este projeto não possui afiliação oficial com o WhatsApp ou Meta Platforms, Inc.*
