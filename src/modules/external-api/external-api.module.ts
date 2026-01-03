import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';

// Entities
import { ApiClient } from '../../database/entities/api-client.entity';
import { PaymentNotification } from '../../database/entities/payment-notification.entity';

// Controllers
import { ExternalApiController } from './controllers/external-api.controller';

// Services
import { ExternalApiService } from './services/external-api.service';

// Strategies
import { ApiKeyStrategy } from './strategies/api-key.strategy';

// SAP Services (importados del módulo de integraciones)
import { SapService } from '../integrations/sap/sap.service';
import { SapDebtService } from '../integrations/sap/sap-debt.service';
import { SapServiceLayerService } from '../integrations/sap/sap-service-layer.service';

/**
 * Módulo para la API externa (bancos y servicios externos)
 * Proporciona endpoints seguros con autenticación API Key
 */
@Module({
    imports: [
        // Registrar entidades
        TypeOrmModule.forFeature([
            ApiClient,
            PaymentNotification,
        ]),

        // Passport para autenticación
        PassportModule.register({ defaultStrategy: 'api-key' }),

        // Config para variables de entorno
        ConfigModule,
    ],
    controllers: [
        ExternalApiController,
    ],
    providers: [
        // Servicios
        ExternalApiService,
        SapServiceLayerService,

        // Estrategia de autenticación
        ApiKeyStrategy,

        // SAP Services (si no están en un módulo compartido, se inyectan aquí)
        // Nota: Estos servicios deberían venir de un módulo compartido
        // Por ahora los incluimos directamente
        SapService,
        SapDebtService,
    ],
    exports: [
        ExternalApiService,
    ],
})
export class ExternalApiModule { }
