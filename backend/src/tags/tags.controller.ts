// ============================================================
// TagsController — API REST para etiquetas
// ============================================================

import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TagsService } from './tags.service';

class CreateTagDto {
    @IsString() @IsNotEmpty() name: string;
    @IsString() @IsOptional() color?: string;
    @IsString() @IsOptional() iconUrl?: string;
    @IsString() @IsOptional() imageUrl?: string;
}

class UpdateTagDto {
    @IsString() @IsOptional() name?: string;
    @IsString() @IsOptional() color?: string;
    @IsString() @IsOptional() iconUrl?: string;
    @IsString() @IsOptional() imageUrl?: string;
}

@Controller('tags')
export class TagsController {
    constructor(private readonly tagsService: TagsService) { }

    @Get()
    async findAll() { return this.tagsService.findAll(); }

    @Get(':id')
    async findById(@Param('id') id: string) { return this.tagsService.findById(id); }

    @Post()
    async create(@Body() dto: CreateTagDto) { return this.tagsService.create(dto); }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
        return this.tagsService.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) { return this.tagsService.delete(id); }
}
