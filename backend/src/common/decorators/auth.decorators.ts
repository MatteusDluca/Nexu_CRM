// ============================================================
// Decorators customizados para Auth
// @Roles() — define roles permitidas na rota
// @CurrentUser() — injeta o usuário autenticado
// @Public() — marca rota como pública (sem JWT)
// ============================================================

import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

// ── Chave de metadados para roles ────────────────────────────
export const ROLES_KEY = 'roles';

/**
 * @Roles(Role.ADMIN, Role.MANAGER)
 * Define quais roles podem acessar a rota.
 * Usado em conjunto com RolesGuard.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// ── Chave de metadados para rotas públicas ───────────────────
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public()
 * Marca uma rota como pública — não exige autenticação JWT.
 * Usado em rotas como login e registro.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * @CurrentUser()
 * Injeta o usuário autenticado no parâmetro do handler.
 * O usuário é populado pelo JwtStrategy.validate().
 *
 * @example
 * @Get('me')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        // Se um campo específico foi solicitado, retorna só ele
        if (data) {
            return user?.[data];
        }

        return user;
    },
);
