import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Strategy } from 'passport-custom';
import { ApiClient } from '../../../database/entities/api-client.entity';
import { Request } from 'express';
import * as crypto from 'crypto';

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
        super();
    }

    /**
     * Método validate llamado por Passport
     * @param req - El objeto request
     */
    async validate(req: Request): Promise<ApiClient> {
        const apiKey = req.headers['api-key'] as string;

        if (!apiKey) {
            this.logger.warn('API Key no proporcionada en el header');
            throw new UnauthorizedException('API Key no proporcionada');
        }

        this.logger.debug(`Validando API Key: ${apiKey.substring(0, 8)}...`);

        // Hashear el API Key recibido con SHA256 para comparar
        const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

        // Buscar directamente en la BD
        const client = await this.apiClientRepository.findOne({
            where: { apiSecret: apiKeyHash, active: true },
        });

        if (!client) {
            this.logger.warn(`Intento de acceso con API Key inválida: ${apiKey.substring(0, 8)}...`);
            throw new UnauthorizedException('API Key inválida o inactiva');
        }

        // Validar IP si está configurada
        if (client.allowedIps) {
            const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
            const allowedIps = client.getAllowedIpsArray();

            if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
                this.logger.warn(`Acceso denegado para ${client.name} desde IP no autorizada: ${clientIp}`);
                throw new UnauthorizedException('IP no autorizada');
            }
        }

        this.logger.log(`Acceso autorizado para cliente: ${client.name}`);
        return client;
    }
}
