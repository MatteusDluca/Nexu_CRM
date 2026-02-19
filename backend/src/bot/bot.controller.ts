// ============================================================
// BotController — API REST para fluxos de bot
// ============================================================

import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Roles } from '../common/decorators/auth.decorators';
import { BotService } from './bot.service';

class CreateBotFlowDto {
    @IsString() @IsNotEmpty() name: string;
    @IsString() @IsOptional() description?: string;
    @IsOptional() nodes?: any;
    @IsOptional() edges?: any;
    @IsString() @IsOptional() trigger?: string;
}

class UpdateBotFlowDto {
    @IsString() @IsOptional() name?: string;
    @IsString() @IsOptional() description?: string;
    @IsOptional() nodes?: any;
    @IsOptional() edges?: any;
    @IsString() @IsOptional() trigger?: string;
    @IsBoolean() @IsOptional() isActive?: boolean;
}

@Controller('bot')
export class BotController {
    private readonly logger = new Logger(BotController.name);

    constructor(private readonly botService: BotService) { }

    @Get('flows')
    async findAll() { return this.botService.findAll(); }

    @Get('flows/:id')
    async findById(@Param('id') id: string) { return this.botService.findById(id); }

    @Post('flows')
    @Roles(Role.ADMIN, Role.MANAGER)
    async create(@Body() dto: CreateBotFlowDto) {
        this.logger.log(`🤖 Criando fluxo: ${dto.name}`);
        return this.botService.create(dto);
    }

    @Put('flows/:id')
    @Roles(Role.ADMIN, Role.MANAGER)
    async update(@Param('id') id: string, @Body() dto: UpdateBotFlowDto) {
        return this.botService.update(id, dto);
    }

    @Patch('flows/:id/toggle')
    @Roles(Role.ADMIN, Role.MANAGER)
    async toggle(@Param('id') id: string) {
        return this.botService.toggleActive(id);
    }

    @Delete('flows/:id')
    @Roles(Role.ADMIN)
    async delete(@Param('id') id: string) {
        return this.botService.delete(id);
    }
}
