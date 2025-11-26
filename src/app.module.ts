import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { postgresConfig, sqlServerConfig } from './config/database.config';
import { SapModule } from './modules/integrations/sap/sap.module';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolModule } from './modules/school/school.module';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [postgresConfig, sqlServerConfig],
      envFilePath: '.env',
    }),

    // PostgreSQL (base de datos principal)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get('postgres'),
      inject: [ConfigService],
    }),

    // Módulo de integración con SAP
    SapModule,

    // Módulo de autenticación
    AuthModule,

    // Módulo escolar (deudas, estudiantes, QR payments)
    SchoolModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

