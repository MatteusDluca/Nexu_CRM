// ============================================================
// JwtAuthGuard — Guard global de autenticação JWT
// Aplicado globalmente, pula rotas marcadas com @Public()
// ============================================================

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    /**
     * Verifica se a rota é pública antes de exigir JWT.
     * Rotas decoradas com @Public() passam direto.
     */
    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }
}
