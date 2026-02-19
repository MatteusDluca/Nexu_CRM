# Media Module

**Desenvolvido por:** Matteus Dluca

## Descrição
Módulo utilitário focado no gerenciamento de upload de arquivos. Permite que o Frontend envie arquivos para o servidor, que são armazenados localmente e linkados em mensagens.

## Estrutura

### MediaController (`media.controller.ts`)
-   **Endpoint**: `POST /media/upload`
-   **Interceptor**: Utiliza `FileInterceptor` do NestJS combinado com `Multer` para processar multipart/form-data.
-   **Armazenamento**: Salva arquivos em `./media/uploads/` com nomes únicos gerados aleatoriamente.
-   **Retorno**: Devolve `{ url, mimetype, filename, size }` para o cliente.

## Segurança
-   Limite de tamanho de arquivo configurado (ex: 50MB).
-   Validação básica de tipos pode ser estendida no `fileFilter`.
