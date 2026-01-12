import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

// Entities
import { ApiClient } from '../../database/entities/api-client.entity';
import { PaymentNotification } from '../../database/entities/payment-notification.entity';

// Controllers
import { ExternalApiController } from './controllers/external-api.controller';

// Services
import { ExternalApiService } from './services/external-api.service';
import { BnbService } from './services/bnb.service';

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

        // HTTP Module para BnbService
        HttpModule,
    ],
    controllers: [
        ExternalApiController,
    ],
    providers: [
        // Servicios
        ExternalApiService,
        BnbService,
        SapServiceLayerService,

        // Estrategia de autenticación
        ApiKeyStrategy,

        SapService,
        SapDebtService,
    ],
    exports: [
        ExternalApiService,
        BnbService,
    ],
})
export class ExternalApiModule { }
