import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Configuración de TypeORM para migraciones
 * Se usa con: npm run migration:generate, npm run migration:run
 * Ahora configurado para SQL Server
 */
export const dataSourceOptions: DataSourceOptions = {
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'dms_sccs',
    entities: [__dirname + '/../database/entities/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
    synchronize: false, // Siempre false para usar migraciones
    logging: process.env.NODE_ENV === 'development',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true,
    },
};

// DataSource para CLI de TypeORM
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
