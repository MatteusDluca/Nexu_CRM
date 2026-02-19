# Whatsapp Module

**Desenvolvido por:** Matteus Dluca

## Descrição
Este é o módulo central do Nexus CRM, responsável por gerenciar toda a comunicação com o WhatsApp utilizando a biblioteca `@whiskeysockets/baileys`. Ele encapsula a complexidade do protocolo WebSocket do WhatsApp e expõe uma API limpa para o restante do sistema.

## Componentes Principais

### WhatsappService (`whatsapp.service.ts`)
O serviço principal que mantém as sessões ativas.
-   **Conexão**: Utiliza `makeWASocket` para criar instâncias de conexão.
-   **Autenticação**: Gerencia credenciais via `useMultiFileAuthState` (adaptado para persistência JSON local).
-   **Eventos**: Escuta eventos do Baileys (`connection.update`, `messages.upsert`) e reage a eles.
-   **Envio**: Fornece métodos como `sendMessage` (texto/mídia) e `sendReadReceipt`.

### WhatsappController (`whatsapp.controller.ts`)
Expositor REST API para controle de sessões.
-   `GET /sessions`: Lista sessões ativas.
-   `POST /sessions`: Cria nova sessão.
-   `POST /:id/connect`: Inicia conexão (gera QR Code).
-   `DELETE /:id`: Remove sessão e arquivos de credencial.

## Fluxo de Mensagens
1.  **Recebimento**: Baileys emite `messages.upsert`. `WhatsappService` normaliza os dados e chama `MessagesService.create`.
2.  **Envio**: Frontend chama API REST. `WhatsappService` busca o socket da sessão e envia o payload.

## Tratamento de Mídia
O módulo detecta URLs de mídia no envio e converte arquivos locais em Buffers compatíveis com o Baileys automaticamente.
