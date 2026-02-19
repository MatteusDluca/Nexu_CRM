# Auth Module

**Desenvolvido por:** Matteus Dluca

## Descrição
Responsável pela segurança e controle de acesso do Nexus CRM. Implementa autenticação baseada em JWT (Json Web Tokens) e estratégias de proteção de rota.

## Estrutura

### AuthService (`auth.service.ts`)
-   **Login**: Valida credenciais (email/senha) e gera par de tokens (Access + Refresh).
-   **Register**: Cria novos usuários no banco de dados com senha hash (Bcrypt).
-   **Refresh**: Renova tokens de acesso expirados.

### Guards e Estratégias
-   **JwtStrategy**: Extrai e valida o token Bearer dos headers.
-   **JwtAuthGuard**: Guardião global que protege todas as rotas (exceto as marcadas com `@Public`).

## Fluxo de Autenticação
1.  Frontend envia credenciais.
2.  Backend valida e retorna `accessToken` (curta duração) e `refreshToken` (longa duração).
3.  Frontend armazena e envia `accessToken` em cada requisição.
4.  Se `accessToken` expira (401), frontend usa `refreshToken` para obter novos tokens silenciosamente.
