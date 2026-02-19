// ============================================================
// TransfersController — API REST para transferências
// ============================================================

import { Body, Controller, Get, Logger, Param, Post, Query } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/auth.decorators';
import { TransfersService } from './transfers.service';

class CreateTransferDto {
    @IsString() @IsNotEmpty() conversationId: string;
    @IsString() @IsOptional() toUserId?: string;
    @IsString() @IsOptional() toDepartmentId?: string;
    @IsString() @IsOptional() reason?: string;
    @IsString() @IsOptional() note?: string;
}

@Controller('transfers')
export class TransfersController {
    private readonly logger = new Logger(TransfersController.name);

    constructor(private readonly transfersService: TransfersService) { }

    /** POST /api/transfers — Criar transferência */
    @Post()
    async create(
        @Body() dto: CreateTransferDto,
        @CurrentUser('id') userId: string,
    ) {
        this.logger.log(`🔄 Transferência criada por ${userId}`);
        return this.transfersService.create({
            ...dto,
            fromUserId: userId,
        });
    }

    /** GET /api/transfers/pending — Listar transferências pendentes */
    @Get('pending')
    async findPending(
        @Query('toUserId') toUserId?: string,
        @Query('toDepartmentId') toDepartmentId?: string,
    ) {
        return this.transfersService.findPending({ toUserId, toDepartmentId });
    }

    /** POST /api/transfers/:id/accept — Aceitar transferência */
    @Post(':id/accept')
    async accept(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.transfersService.accept(id, userId);
    }

    /** POST /api/transfers/:id/reject — Rejeitar transferência */
    @Post(':id/reject')
    async reject(@Param('id') id: string) {
        return this.transfersService.reject(id);
    }
}
