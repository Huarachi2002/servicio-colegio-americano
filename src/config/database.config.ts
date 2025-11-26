import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConnectionOptions } from 'mssql';

/**
 * Configuración de PostgreSQL (Base de datos principal)
 */
export const postgresConfig = registerAs(
    'postgres',
    (): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'dms2_database',
        entities: [__dirname + '/../database/entities/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV === 'development', // false en producción
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),
);

/**
 * Configuración de SQL Server (SAP Integration)
 */
export const sqlServerConfig = registerAs(
    'sqlserver',
    (): ConnectionOptions => ({
        server: process.env.MSSQL_HOST || 'localhost',
        port: parseInt(process.env.MSSQL_PORT, 10) || 1433,
        user: process.env.MSSQL_USERNAME || 'sa',
        password: process.env.MSSQL_PASSWORD || '',
        database: process.env.MSSQL_DATABASE || 'integrador_icorebiz',
        options: {
            encrypt: process.env.MSSQL_ENCRYPT === 'true',
            trustServerCertificate:
                process.env.MSSQL_TRUST_SERVER_CERTIFICATE === 'true',
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
