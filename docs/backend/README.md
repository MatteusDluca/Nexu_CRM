# Referência Técnica Backend

**Desenvolvido por:** Matteus Dluca

## Estrutura Modular
O backend do Nexus CRM é organizado em módulos independentes. Abaixo você encontra a documentação específica de cada um:

-   [🔐 Auth Module](modules/auth.md): Autenticação, JWT e Guards.
-   [🟢 Whatsapp Module](modules/whatsapp.md): Conexão com Baileys, envio e recebimento.
-   [💬 Messages Module](modules/messages.md): Persistência de mensagens e contatos.
-   [📂 Media Module](modules/media.md): Upload e armazenamento de arquivos.

## Fluxos Gerais
### WebSocket Gateway (`app.gateway.ts`)
Conecta o frontend em tempo real. Responsável por emitir eventos como `message.new` quando o `WhatsappService` recebe dados.
