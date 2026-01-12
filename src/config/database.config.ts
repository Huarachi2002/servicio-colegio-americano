import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConnectionOptions } from 'mssql';

/**
 * Configuración de SQL Server (Base de datos principal de la aplicación)
 * Usa la misma instancia de SQL Server que SAP pero con una base de datos separada
 */
export const appDatabaseConfig = registerAs(
    'database',
    (): TypeOrmModuleOptions => ({
        type: 'mssql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 1433,
        username: process.env.DB_USERNAME || 'sa',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'dms_sccs',
        entities: [__dirname + '/../database/entities/**/*.entity{.ts,.js}'],
        synchronize: false, // NUNCA usar true en producción
        logging: process.env.NODE_ENV === 'development',
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
            enableArithAbort: true,
        },
        pool: {
            max: 10,
            min: 2,
            idleTimeoutMillis: 30000,
        },
    }),
);

/**
 * Configuración de SQL Server SAP (conexión separada para integración SAP)
 * Esta es la base de datos de SAP que ya existe
 */
export const sapDatabaseConfig = registerAs(
    'sapDatabase',
    (): ConnectionOptions => ({
        server: process.env.SAP_DB_HOST || 'localhost',
        port: parseInt(process.env.SAP_DB_PORT, 10) || 1433,
        user: process.env.SAP_DB_USERNAME || 'sa',
        password: process.env.SAP_DB_PASSWORD || '',
        database: process.env.SAP_DB_DATABASE || 'SCCS_QAS',
        options: {
            encrypt: process.env.SAP_DB_ENCRYPT === 'true',
            trustServerCertificate:
                process.env.SAP_DB_TRUST_SERVER_CERTIFICATE === 'true',
            enableArithAbort: true,
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
        requestTimeout: 30000,
    }),
);
