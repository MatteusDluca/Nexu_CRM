// ============================================================
// DTOs de Usuários
// Validação para criação e atualização de usuários
// ============================================================

import { Role } from '@prisma/client';
import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';

/**
 * DTO para criação de usuário (por Admin).
 */
export class CreateUserDto {
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome é obrigatório' })
    name: string;

    @IsEmail({}, { message: 'Email deve ser um email válido' })
    @IsNotEmpty({ message: 'Email é obrigatório' })
    email: string;

    @IsString({ message: 'Senha deve ser uma string' })
    @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
    password: string;

    @IsEnum(Role, { message: 'Role deve ser USER, MANAGER ou ADMIN' })
    @IsOptional()
    role?: Role;

    @IsString()
    @IsOptional()
    departmentId?: string;
}

/**
 * DTO para atualização de usuário.
 * Todos os campos são opcionais.
 */
export class UpdateUserDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @MinLength(6)
    @IsOptional()
    password?: string;

    @IsEnum(Role)
    @IsOptional()
    role?: Role;

    @IsString()
    @IsOptional()
    avatar?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsString()
    @IsOptional()
    departmentId?: string;
}
