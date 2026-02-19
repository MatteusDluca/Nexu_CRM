// ============================================================
// LoggingMiddleware — Middleware global de observabilidade
// Loga todas as requisições HTTP com métricas de performance
// Integra com Log_Master quando disponível
// ============================================================

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction): void {
        const startTime = Date.now();
        const { method, originalUrl, ip } = req;
        const userAgent = req.get('user-agent') || 'unknown';

        // Capturar o userId do JWT se autenticado
        const userId = (req as any).user?.id || 'anonymous';

        // Hook no finish do response para logar métricas
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const { statusCode } = res;
            const contentLength = res.get('content-length') || '0';

            // Nível de log baseado no status code
            const logData = {
                method,
                url: originalUrl,
                status: statusCode,
                duration: `${duration}ms`,
                size: `${contentLength}b`,
                user: userId,
                ip,
                userAgent: userAgent.substring(0, 50),
            };

            if (statusCode >= 500) {
                this.logger.error(`❌ ${method} ${originalUrl} ${statusCode} — ${duration}ms`, JSON.stringify(logData));
            } else if (statusCode >= 400) {
                this.logger.warn(`⚠️ ${method} ${originalUrl} ${statusCode} — ${duration}ms`, JSON.stringify(logData));
            } else {
                this.logger.log(`✅ ${method} ${originalUrl} ${statusCode} — ${duration}ms`);
            }

            // TODO (Fase 8): Enviar para Log_Master via SDK
            // if (this.logMasterClient) {
            //   this.logMasterClient.sendLog({
            //     level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
            //     message: `${method} ${originalUrl} ${statusCode}`,
            //     metadata: logData,
            //     source: 'whatsapp-crm-backend',
            //   });
            // }
        });

        next();
    }
}
