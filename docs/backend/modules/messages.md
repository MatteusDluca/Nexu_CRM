# Messages Module

**Desenvolvido por:** Matteus Dluca

## Descrição
Gerencia a persistência e recuperação de mensagens no banco de dados MongoDB. Atua como intermediário entre a camada de conexão (WhatsappModule) e a interface do usuário.

## Funcionalidades

### MessagesService (`messages.service.ts`)
-   **Create**: Salva novas mensagens, vinculando-as a uma Conversa (`Conversation`) e um Contato (`Contact`).
-   **List**: Recupera histórico de mensagens de uma conversa com paginação (cursor-based).
-   **UpdateStatus**: Atualiza status de entrega (SENT, DELIVERED, READ) baseado em eventos do WhatsApp.

## Modelo de Dados (Prisma)
A `Message` armazena:
-   `content`: Texto ou legenda.
-   `type`: TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT.
-   `mediaUrl`: Caminho relativo para arquivos de mídia.
-   `status`: Estado atual da mensagem.
-   `fromMe`: Booleano indicando se foi enviada pelo sistema.
