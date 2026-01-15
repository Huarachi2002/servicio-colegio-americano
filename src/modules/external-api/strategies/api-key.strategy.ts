import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Strategy from 'passport-headerapikey';
import { ApiClient } from '../../../database/entities/api-client.entity';

/**
 * Estrategia Passport para autenticación por API Key
 * Valida el header Api-Key contra la tabla api_clients
 */
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    private readonly logger = new Logger(ApiKeyStrategy.name);

    constructor(
        @InjectRepository(ApiClient)
        private readonly apiClientRepository: Repository<ApiClient>,
    ) {
        super(
            { header: 'Api-Key', prefix: '' },
            true, // passReqToCallback
        );
    }

    /**
     * Método validate llamado por Passport después de extraer el API Key
     * @param apiKey - El API Key extraído del header
     * @param req - El objeto request (disponible porque passReqToCallback = true)
     * @param done - Callback para indicar éxito o error
     */
    async validate(
        apiKey: string,
        done: (err: Error | null, user?: any, info?: any) => void,
        req?: any,
    ): Promise<void> {
        try {
            if (!apiKey) {
                return done(new UnauthorizedException('API Key no proporcionada'));
            }

            const client = await this.apiClientRepository.findOne({
                where: { apiSecret: apiKey, active: true },
            });

            if (!client) {
                this.logger.warn(`Intento de acceso con API Key inválida: ${apiKey.substring(0, 8)}...`);
                return done(new UnauthorizedException('API Key inválida o inactiva'));
            }

            // Validar IP si está configurada
            if (client.allowedIps && req) {
                const clientIp = req?.ip || req?.connection?.remoteAddress;
                const allowedIps = client.getAllowedIpsArray();

                if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
                    this.logger.warn(`Acceso denegado para ${client.name} desde IP no autorizada: ${clientIp}`);
                    return done(new UnauthorizedException('IP no autorizada'));
                }
            }

            this.logger.log(`Acceso autorizado para cliente: ${client.name}`);
            return done(null, client);
        } catch (error) {
            this.logger.error(`Error validando API Key: ${error.message}`);
            return done(error);
        }
    }
}
