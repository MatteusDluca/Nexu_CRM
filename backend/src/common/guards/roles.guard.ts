// ============================================================
// RolesGuard — Guard de autorização baseado em roles
// Verifica se o usuário tem a role necessária para a rota
// ============================================================

import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/auth.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);

    constructor(private reflector: Reflector) { }

    /**
     * Verifica se o usuário autenticado possui uma das roles exigidas.
     * Se nenhuma role foi definida na rota, permite acesso (rota não restrita).
     */
    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Se não há roles definidas, a rota está aberta (para qualquer autenticado)
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            this.logger.warn('🔒 RolesGuard: Nenhum usuário no request');
            throw new ForbiddenException('Acesso negado');
        }

        const hasRole = requiredRoles.includes(user.role);

        if (!hasRole) {
            this.logger.warn(
                `🔒 Acesso negado para ${user.email} (role: ${user.role}). ` +
                `Roles necessárias: ${requiredRoles.join(', ')}`,
            );
            throw new ForbiddenException(
                `Acesso negado. Roles necessárias: ${requiredRoles.join(', ')}`,
            );
        }

        return true;
    }
}
