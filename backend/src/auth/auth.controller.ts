// ============================================================
// AuthController — Endpoints de autenticação
// POST /api/auth/register — Registro
// POST /api/auth/login — Login
// POST /api/auth/refresh — Refresh token
// GET  /api/auth/me — Perfil do usuário autenticado
// ============================================================

import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Logger,
    Post,
} from '@nestjs/common';
import { CurrentUser, Public } from '../common/decorators/auth.decorators';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

    /**
     * POST /api/auth/register
     * Registra novo usuário. Rota pública.
     */
    @Public()
    @Post('register')
    async register(@Body() dto: RegisterDto) {
        this.logger.log(`📝 Registro: ${dto.email}`);
        return this.authService.register(dto);
    }

    /**
     * POST /api/auth/login
     * Autentica usuário. Rota pública.
     */
    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        this.logger.log(`🔑 Login: ${dto.email}`);
        return this.authService.login(dto);
    }

    /**
     * POST /api/auth/refresh
     * Gera novos tokens usando refresh token. Rota pública.
     */
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshTokens(@Body() dto: RefreshTokenDto) {
        this.logger.log('🔄 Refresh token solicitado');
        return this.authService.refreshTokens(dto.refreshToken);
    }

    /**
     * GET /api/auth/me
     * Retorna perfil do usuário autenticado. Requer JWT válido.
     */
    @Get('me')
    async getProfile(@CurrentUser() user: any) {
        this.logger.log(`👤 Perfil acessado: ${user.email}`);
        return { user };
    }
}
