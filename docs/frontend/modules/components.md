# Componentes e UI

**Desenvolvido por:** Matteus Dluca

## Design System
O projeto utiliza **Shadcn/UI** como base, construído sobre Radix UI e estilizado com TailwindCSS.

## Componentes Reutilizáveis (`src/components/ui`)
Contém os blocos fundamentais da interface:
-   `button.tsx`: Botões com variantes (default, outline, ghost).
-   `input.tsx`, `textarea.tsx`: Campos de formulário.
-   `avatar.tsx`: Exibição de imagem de perfil com fallback.
-   `dialog.tsx`: Modais e popups.
-   `scroll-area.tsx`: Container com scroll customizado.

## Layout (`src/components/layout`)
-   **Sidebar**: Navegação principal lateral. Controla o estado de seleção de conversas.
-   **ChatWindow**: (Atualmente inline em `dashboard/page.tsx`, futuro componente) Área principal de conversa.
