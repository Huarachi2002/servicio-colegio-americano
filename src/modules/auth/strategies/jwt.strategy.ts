import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MobileUser } from '../../../database/entities/mobile-user.entity';
import { User } from '../../../database/entities/users.entity';

export interface JwtPayload {
    sub: number;        // ID del usuario
    username: string;
    entityId?: number;  // Solo para mobile users
    entityType?: string; // Solo para mobile users
    email?: string;
    isMobileUser?: boolean; // Flag para diferenciar tipo de usuario
    iat?: number;       // Issued at
    exp?: number;       // Expiration
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(MobileUser)
        private readonly mobileUserRepository: Repository<MobileUser>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
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

    async validate(payload: JwtPayload): Promise<MobileUser | User> {
        const { sub: userId, isMobileUser } = payload;

        // Determinar si es usuario móvil o web
        if (isMobileUser) {
            // Buscar usuario móvil
            const mobileUser = await this.mobileUserRepository.findOne({
                where: { id: userId },
            });

            if (!mobileUser) {
                throw new UnauthorizedException('Usuario móvil no encontrado o token inválido');
            }

            if (mobileUser.state !== 1) {
                throw new UnauthorizedException('Usuario móvil deshabilitado');
            }

            return mobileUser;
        } else {
            // Buscar usuario web
            const webUser = await this.userRepository.findOne({
                where: { id: userId },
            });

            if (!webUser) {
                throw new UnauthorizedException('Usuario web no encontrado o token inválido');
            }

            if (webUser.state !== 1) {
                throw new UnauthorizedException('Usuario web deshabilitado');
            }

            return webUser;
        }
    }
}
