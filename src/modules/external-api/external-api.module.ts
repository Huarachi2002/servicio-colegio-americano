import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ApiClient } from '../../database/entities/api-client.entity';
import { PaymentNotification } from '../../database/entities/payment-notification.entity';
import { Payment } from '../../database/entities/payment.entity';
import { ExternalApiController } from './controllers/external-api.controller';
import { ExternalApiService } from './services/external-api.service';
import { BnbService } from './services/bnb.service';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { SapModule } from '../integrations/sap/sap.module';

@Module({
    imports: [
        // Registrar entidades
        TypeOrmModule.forFeature([
            ApiClient,
            PaymentNotification,
            Payment,
        ]),
        PassportModule.register({ defaultStrategy: 'api-key' }),
        ConfigModule,
        HttpModule,
        SapModule,
    ],
    controllers: [
        ExternalApiController,
    ],
    providers: [
        ExternalApiService,
        BnbService,
        ApiKeyStrategy,
    ],
    exports: [
        ExternalApiService,
        BnbService,
    ],
})
export class ExternalApiModule { }
