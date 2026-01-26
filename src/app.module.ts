import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appDatabaseConfig, sapDatabaseConfig } from './config/database.config';
import { SapModule } from './modules/integrations/sap/sap.module';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolModule } from './modules/school/school.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { LoggerModule } from './common/logger';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appDatabaseConfig, sapDatabaseConfig],
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get('database'),
      inject: [ConfigService],
    }),
    LoggerModule,
    SapModule,
    AuthModule,
    SchoolModule,
    ExternalApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

