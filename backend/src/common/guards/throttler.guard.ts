// ============================================================
// ThrottlerGuard — Rate Limiting global para API
// Protege endpoints contra abuso e spam
// ============================================================

import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
    private readonly logger = new Logger('RateLimit');

    /**
     * Extrai IP + userId para rate limiting por usuário autenticado.
     * Sem userId, faz rate limit por IP.
     */
    protected async getTracker(req: Record<string, any>): Promise<string> {
        const userId = req.user?.id;
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';

        if (userId) {
            return `${userId}-${ip}`;
        }
        return ip;
    }

    /**
     * Log quando rate limit é atingido (para monitoramento).
     */
    protected async throwThrottlingException(
        context: ExecutionContext,
        throttlerLimitDetail: ThrottlerLimitDetail,
    ): Promise<void> {
        const req = context.switchToHttp().getRequest();
        this.logger.warn(
            `🚫 Rate limit atingido: ${req.method} ${req.url} — IP: ${req.ip} — User: ${req.user?.id || 'anonymous'}`,
        );
        return super.throwThrottlingException(context, throttlerLimitDetail);
    }
}
