// ============================================================
// DTOs de Autenticação
// Validação de dados de entrada para login e registro
// ============================================================

import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO para registro de novo usuário.
 * Validação: email único, senha com mínimo 6 caracteres, role opcional.
 */
export class RegisterDto {
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
}

/**
 * DTO para login.
 * Apenas email e senha são necessários.
 */
export class LoginDto {
    @IsEmail({}, { message: 'Email deve ser um email válido' })
    @IsNotEmpty({ message: 'Email é obrigatório' })
    email: string;

    @IsString({ message: 'Senha deve ser uma string' })
    @IsNotEmpty({ message: 'Senha é obrigatória' })
    password: string;
}

/**
 * DTO para refresh de token.
 * Recebe o refresh_token para gerar um novo access_token.
 */
export class RefreshTokenDto {
    @IsString({ message: 'Refresh token deve ser uma string' })
    @IsNotEmpty({ message: 'Refresh token é obrigatório' })
    refreshToken: string;
}
