import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SapService } from './sap.service';
import { SapDebtService } from './sap-debt.service';
import { SapServiceLayerService } from './sap-service-layer.service';
import { SapSyncService } from './sap-sync.service';
import { SapSyncController } from './controllers/sap-sync.controller';
import { MobileUser } from 'src/database/entities/mobile-user.entity';
import { Father } from 'src/database/entities/father.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([MobileUser, Father]),
    ],
    controllers: [SapSyncController],
    providers: [
        SapService, 
        SapDebtService, 
        SapServiceLayerService, // Mantener para operaciones de escritura (facturas, pagos)
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
