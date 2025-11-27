import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MobileUser } from '../../../database/entities/mobile-user.entity';

/**
 * Interface para el payload del JWT
 */
export interface JwtPayload {
    sub: number;        // ID del usuario
    username: string;
    entityId: number;
    entityType: string;
    userType: number;
    email: string;
    iat?: number;       // Issued at
    exp?: number;       // Expiration
}

/**
 * Estrategia JWT para autenticación de API móvil
 * Valida el token Bearer enviado en el header Authorization
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'mobile-api') {
    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(MobileUser)
        private readonly mobileUserRepository: Repository<MobileUser>,
    ) {
        super({
            // Extrae el token del header Authorization: Bearer <token>
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            // No ignorar expiración
            ignoreExpiration: false,
            // Secreto para verificar el token
            secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret-key',
        });
    }

    /**
     * Valida el payload del JWT y retorna el usuario
     * Este método es llamado automáticamente por Passport después de verificar la firma
     * @param payload - Payload decodificado del JWT
     * @returns Usuario validado que se adjunta a request.user
     */
    async validate(payload: JwtPayload): Promise<MobileUser> {
        const { sub: userId } = payload;

        // Buscar el usuario en la base de datos
        const user = await this.mobileUserRepository.findOne({
            where: { id: userId },
        });

        // Si no existe el usuario, rechazar
        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado o token inválido');
        }

        // Verificar que el usuario esté activo
        if (user.state !== 1) {
            throw new UnauthorizedException('Usuario deshabilitado');
        }

        // Retornar el usuario (se adjuntará a request.user)
        return user;
    }
}
