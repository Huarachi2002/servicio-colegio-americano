import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ConnectorService } from './services/connector.service';

@Module({
    imports: [
        HttpModule,
        ConfigModule,
    ],
    providers: [
        ConnectorService,
    ],
    exports: [
        ConnectorService,  // ← Importante: exportar para que otros módulos puedan usarlo
    ],
})
export class ConnectorModule { }
