# Hooks e Contextos

**Desenvolvido por:** Matteus Dluca

## Gestão de Estado Global
O frontend evita bibliotecas complexas como Redux, preferindo Context API e Hooks nativos para simplicidade e performance.

### AuthContext (`src/lib/auth-context.tsx`)
-   Mantém o estado do usuário logado (`user`).
-   Verifica token (`accessToken`) na inicialização.
-   Fornece métodos `login` e `logout`.
-   Protege rotas privadas redirecionando para `/login`.

### SocketContext (`src/lib/socket-context.tsx`)
-   Gerencia a conexão única via Socket.io com o backend.
-   Reconecta automaticamente em caso de queda.
-   Distribui eventos globais (`message.new`, `session.status`) para componentes inscritos via `useSocket`.
