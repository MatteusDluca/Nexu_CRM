// ============================================================
// DepartmentsController — API REST para departamentos
// ============================================================

import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Roles } from '../common/decorators/auth.decorators';
import { DepartmentsService } from './departments.service';

class CreateDepartmentDto {
    @IsString() @IsNotEmpty() name: string;
    @IsString() @IsOptional() description?: string;
}

@Controller('departments')
export class DepartmentsController {
    constructor(private readonly departmentsService: DepartmentsService) { }

    @Get()
    async findAll() { return this.departmentsService.findAll(); }

    @Get(':id')
    async findById(@Param('id') id: string) { return this.departmentsService.findById(id); }

    @Post()
    @Roles(Role.ADMIN)
    async create(@Body() dto: CreateDepartmentDto) { return this.departmentsService.create(dto); }

    @Put(':id')
    @Roles(Role.ADMIN)
    async update(@Param('id') id: string, @Body() dto: CreateDepartmentDto) {
        return this.departmentsService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    async delete(@Param('id') id: string) { return this.departmentsService.delete(id); }
}
