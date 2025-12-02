import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Configuración de TypeORM para migraciones
 * Se usa con: npm run migration:generate, npm run migration:run
 */
export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'dms2_database',
    entities: [__dirname + '/../database/entities/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
    synchronize: false, // Siempre false para usar migraciones
    logging: process.env.NODE_ENV === 'development',
};

// DataSource para CLI de TypeORM
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
