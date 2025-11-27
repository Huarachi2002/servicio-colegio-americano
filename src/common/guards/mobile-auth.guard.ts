import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard para autenticación de API mobile
 * Usa la estrategia 'mobile-api' de Passport (JWT)
 * 
 * Uso: Agregar @UseGuards(MobileAuthGuard) en el controlador o endpoint
 * El token debe enviarse en el header: Authorization: Bearer <token>
 */
@Injectable()
export class MobileAuthGuard extends AuthGuard('mobile-api') {
    /**
     * Maneja errores de autenticación
     */
    handleRequest<TUser = any>(err: any, user: TUser, info: any, context: ExecutionContext): TUser {
        // Si hay error o no hay usuario, lanzar excepción
        if (err || !user) {
            throw err || new UnauthorizedException('Token inválido o expirado');
        }
        return user;
    }
}
