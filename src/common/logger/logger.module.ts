import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomLoggerService } from './logger.service';

/**
 * Módulo global de logging
 * Proporciona el servicio de logging a toda la aplicación
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [CustomLoggerService],
    exports: [CustomLoggerService],
})
export class LoggerModule {}
