import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SapService } from './services/sap.service';
import { SapDebtService } from './services/sap-debt.service';
import { SapServiceLayerService } from './services/sap-service-layer.service';
import { SapSyncService } from './services/sap-sync.service';
import { SapSyncController } from './controllers/sap-sync.controller';
import { MobileUser } from '../../../database/entities/mobile-user.entity';
import { Father } from '../../../database/entities/father.entity';
import { Employee } from '../../../database/entities/employee.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([MobileUser, Father, Employee]),
    ],
    controllers: [SapSyncController],
    providers: [
        SapService, 
        SapDebtService, 
        SapServiceLayerService,
        SapSyncService,
    ],
    exports: [
        SapService, 
        SapDebtService, 
        SapServiceLayerService,
        SapSyncService,
    ],
})
export class SapModule { }
