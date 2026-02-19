// ============================================================
// UsersController — Endpoints de gerenciamento de usuários
// Apenas ADMIN pode criar/editar/deletar usuários
// ============================================================

import {
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    Param,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(private readonly usersService: UsersService) { }

    /**
     * GET /api/users
     * Lista todos os usuários. Requer ADMIN ou MANAGER.
     */
    @Get()
    @Roles(Role.ADMIN, Role.MANAGER)
    async findAll() {
        return this.usersService.findAll();
    }

    /**
     * GET /api/users/:id
     * Busca usuário por ID. Requer ADMIN ou MANAGER.
     */
    @Get(':id')
    @Roles(Role.ADMIN, Role.MANAGER)
    async findById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    /**
     * POST /api/users
     * Cria novo usuário. Apenas ADMIN.
     */
    @Post()
    @Roles(Role.ADMIN)
    async create(@Body() dto: CreateUserDto) {
        this.logger.log(`👤 Admin criando usuário: ${dto.email}`);
        return this.usersService.create(dto);
    }

    /**
     * PUT /api/users/:id
     * Atualiza usuário. Apenas ADMIN.
     */
    @Put(':id')
    @Roles(Role.ADMIN)
    async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        this.logger.log(`📝 Admin atualizando usuário: ${id}`);
        return this.usersService.update(id, dto);
    }

    /**
     * PATCH /api/users/:id/deactivate
     * Desativa usuário (soft delete). Apenas ADMIN.
     */
    @Patch(':id/deactivate')
    @Roles(Role.ADMIN)
    async deactivate(@Param('id') id: string) {
        this.logger.log(`🔒 Admin desativando usuário: ${id}`);
        return this.usersService.deactivate(id);
    }

    /**
     * DELETE /api/users/:id
     * Remove usuário permanentemente. Apenas ADMIN.
     */
    @Delete(':id')
    @Roles(Role.ADMIN)
    async delete(@Param('id') id: string) {
        this.logger.log(`🗑️ Admin removendo usuário: ${id}`);
        return this.usersService.delete(id);
    }
}
