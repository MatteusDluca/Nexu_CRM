// ============================================================
// ContactsController — API REST para contatos CRM
// ============================================================

import { Body, Controller, Delete, Get, Logger, Param, Post, Put, Query } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ContactsService } from './contacts.service';

class CreateContactDto {
    @IsString() @IsNotEmpty() phone: string;
    @IsString() @IsOptional() name?: string;
    @IsEmail() @IsOptional() email?: string;
    @IsString() @IsOptional() notes?: string;
    @IsOptional() customFields?: any;
    @IsOptional() tagIds?: string[];
}

class UpdateContactDto {
    @IsString() @IsOptional() name?: string;
    @IsEmail() @IsOptional() email?: string;
    @IsString() @IsOptional() notes?: string;
    @IsOptional() customFields?: any;
    @IsOptional() tagIds?: string[];
}

@Controller('contacts')
export class ContactsController {
    private readonly logger = new Logger(ContactsController.name);

    constructor(private readonly contactsService: ContactsService) { }

    @Get()
    async findAll(
        @Query('search') search?: string,
        @Query('take') take?: number,
        @Query('skip') skip?: number,
    ) {
        return this.contactsService.findAll({ search, take: take ? Number(take) : undefined, skip: skip ? Number(skip) : undefined });
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.contactsService.findById(id);
    }

    @Post()
    async create(@Body() dto: CreateContactDto) {
        this.logger.log(`👤 Criando contato: ${dto.phone}`);
        return this.contactsService.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
        return this.contactsService.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.contactsService.delete(id);
    }
}
