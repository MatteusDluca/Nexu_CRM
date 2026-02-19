// ============================================================
// AuthService — Lógica de autenticação
// Login, Register, Refresh Token, Hash de senha
// ============================================================

import {
    ConflictException,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

/** Resposta padrão de autenticação com tokens */
export interface AuthResponse {
    user: {
        id: string;
        name: string;
        email: string;
        role: Role;
        avatar: string | null;
    };
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    // ── REGISTER ───────────────────────────────────────────────

    /**
     * Registra um novo usuário.
     * - Verifica se email já existe
     * - Faz hash da senha com bcrypt (salt 12)
     * - Gera access + refresh tokens
     */
    async register(dto: RegisterDto): Promise<AuthResponse> {
        // Verificar email duplicado
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            this.logger.warn(`⚠️ Tentativa de registro com email duplicado: ${dto.email}`);
            throw new ConflictException('Email já cadastrado');
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(dto.password, 12);

        // Primeiro usuário registrado vira ADMIN automaticamente
        const userCount = await this.prisma.user.count();
        const assignedRole = userCount === 0 ? Role.ADMIN : (dto.role || Role.USER);

        // Criar usuário
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
                role: assignedRole,
            },
        });

        this.logger.log(`✅ Novo usuário registrado: ${user.email} (role: ${user.role})`);

        // Gerar tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
            ...tokens,
        };
    }

    // ── LOGIN ──────────────────────────────────────────────────

    /**
     * Autentica um usuário existente.
     * - Verifica se email existe
     * - Compara senha com hash
     * - Verifica se conta está ativa
     * - Gera novos tokens
     */
    async login(dto: LoginDto): Promise<AuthResponse> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            this.logger.warn(`🔒 Login falhou — email não encontrado: ${dto.email}`);
            throw new UnauthorizedException('Credenciais inválidas');
        }

        if (!user.isActive) {
            this.logger.warn(`🔒 Login bloqueado — conta desativada: ${dto.email}`);
            throw new UnauthorizedException('Conta desativada. Contate o administrador.');
        }

        const passwordValid = await bcrypt.compare(dto.password, user.password);

        if (!passwordValid) {
            this.logger.warn(`🔒 Login falhou — senha incorreta para: ${dto.email}`);
            throw new UnauthorizedException('Credenciais inválidas');
        }

        this.logger.log(`✅ Login bem-sucedido: ${user.email}`);

        const tokens = await this.generateTokens(user.id, user.email, user.role);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
            ...tokens,
        };
    }

    // ── REFRESH TOKEN ──────────────────────────────────────────

    /**
     * Gera novo access_token usando um refresh_token válido.
     * - Decodifica o refresh_token
     * - Verifica se o usuário ainda existe e está ativo
     * - Gera novos tokens (rotação de refresh token)
     */
    async refreshTokens(refreshToken: string): Promise<AuthResponse> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user || !user.isActive) {
                throw new UnauthorizedException('Refresh token inválido');
            }

            const tokens = await this.generateTokens(user.id, user.email, user.role);

            return {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                },
                ...tokens,
            };
        } catch (error) {
            this.logger.warn('🔒 Refresh token inválido ou expirado');
            throw new UnauthorizedException('Refresh token inválido ou expirado');
        }
    }

    // ── HELPERS ────────────────────────────────────────────────

    /**
     * Gera par de tokens (access + refresh).
     * Access token: curta duração (15min default)
     * Refresh token: longa duração (7d default)
     */
    private async generateTokens(
        userId: string,
        email: string,
        role: Role,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const payload = { sub: userId, email, role };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRATION', '15m') as any,
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d') as any,
            }),
        ]);

        return { accessToken, refreshToken };
    }
}
