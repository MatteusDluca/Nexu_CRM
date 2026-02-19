// ============================================================
// JWT Strategy — Validação de Access Tokens
// Extrai e valida o JWT do header Authorization
// ============================================================

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Payload decodificado do JWT.
 * sub = userId, email = email do usuário, role = nível de permissão.
 */
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET', 'default-secret'),
        });
    }

    /**
     * Valida o payload do JWT.
     * Busca o usuário no banco para garantir que ainda existe e está ativo.
     * Retorna o usuário completo (sem senha) para ser injetado via @CurrentUser().
     */
    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                isActive: true,
                departmentId: true,
            },
        });

        if (!user) {
            this.logger.warn(`🔒 Token JWT com userId inexistente: ${payload.sub}`);
            throw new UnauthorizedException('Usuário não encontrado');
        }

        if (!user.isActive) {
            this.logger.warn(`🔒 Usuário desativado tentou autenticar: ${user.email}`);
            throw new UnauthorizedException('Conta desativada');
        }

        return user;
    }
}
