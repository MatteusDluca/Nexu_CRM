// ============================================================
// HttpExceptionFilter — Filtro global de exceções
// Captura todas as exceções e formata resposta padronizada
// Integra com Log_Master para tracking de erros
// ============================================================

import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('ExceptionFilter');

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        try {
            // Determinar status code
            const status =
                exception instanceof HttpException
                    ? exception.getStatus()
                    : HttpStatus.INTERNAL_SERVER_ERROR;

            // Extrair mensagem de erro
            let message: string | object = 'Erro interno do servidor';
            let errorDetails: any = null;

            if (exception instanceof HttpException) {
                const exceptionResponse = exception.getResponse();
                if (typeof exceptionResponse === 'string') {
                    message = exceptionResponse;
                } else if (typeof exceptionResponse === 'object') {
                    message = (exceptionResponse as any).message || exception.message;
                    errorDetails = (exceptionResponse as any).error;
                }
            } else if (exception instanceof Error) {
                message = exception.message;
            }

            // Formatar resposta padronizada
            const errorResponse = {
                statusCode: status,
                timestamp: new Date().toISOString(),
                path: request.url,
                method: request.method,
                message,
                ...(errorDetails && { error: errorDetails }),
            };

            // Log do erro com contexto
            // Removendo body para evitar erros de circular dependency ou tamanho excessivo
            /*
            const logContext = {
                ...errorResponse,
                userId: (request as any).user?.id || 'anonymous',
                ip: request.ip,
                stack: exception instanceof Error ? exception.stack : undefined,
            };
            */

            if (status >= 500) {
                this.logger.error(
                    `💥 [${request.method}] ${request.url} — ${status}:`,
                    // Logamos message como objeto (segundo arg) ou string. O logger do Nest lida melhor que JSON.stringify manual
                    message,
                );
                if (exception instanceof Error && exception.stack) {
                    this.logger.error(exception.stack);
                }
            } else if (status >= 400) {
                this.logger.warn(
                    `⚠️ [${request.method}] ${request.url} — ${status}: ${typeof message === 'string' ? message : JSON.stringify(message)}`,
                );
            }

            response.status(status).json(errorResponse);
        } catch (filterError) {
            // Fallback de segurança se o filtro falhar
            console.error('CRITICAL ERROR IN EXCEPTION FILTER:', filterError);
            if (exception instanceof Error) {
                console.error('ORIGINAL ERROR WAS:', exception.stack || exception);
            }
            response.status(500).json({
                statusCode: 500,
                message: 'Internal Server Error (Filter Failed)',
            });
        }
    }
}
