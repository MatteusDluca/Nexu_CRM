# API Client

**Desenvolvido por:** Matteus Dluca

## Wrapper Fetch (`src/lib/api.ts`)
O cliente HTTP centralizado abstrai a comunicação com o backend NestJS.

### Funcionalidades
1.  **Interceptors Automáticos**:
    -   Adiciona header `Authorization: Bearer <token>` em todas as requisições autenticadas.
    -   Define `Content-Type: application/json` por padrão (exceto para upload de arquivos).
2.  **Refresh Token**:
    -   Intercepta erros `401 Unauthorized`.
    -   Tenta renovar o token usando o endpoint `/auth/refresh`.
    -   Refaz a requisição original com o novo token de forma transparente.
    -   Desloga o usuário se a renovação falhar.

### Módulos de API
O arquivo exporta objetos agrupados por domínio:
-   `authApi`: Login, register, me.
-   `whatsappApi`: Sessões, conexão, envio de mensagem.
-   `messagesApi`: Listagem de histórico.
-   `mediaApi`: Upload de arquivos (Multipart).
