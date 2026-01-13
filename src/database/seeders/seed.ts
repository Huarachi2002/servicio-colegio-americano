import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { runAllSeeders, revertAllSeeders, runSeeder } from './index';

// Cargar variables de entorno
config({ path: join(__dirname, '../../../.env') });

async function main() {
    // Crear conexión a la base de datos
    const dataSource = new DataSource({
        type: 'mssql',
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT) || 1433,
        username: process.env.DB_USERNAME || 'sa',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'dms_sccs',
        entities: [join(__dirname, '../entities/*.entity.{ts,js}')],
        synchronize: false, 
    });

    try {
        // Inicializar conexión
        console.log('Conectando a la base de datos...');
        await dataSource.initialize();
        console.log('Conexión establecida');
        console.log('');

        // Obtener comando
        const command = process.argv[2];

        if (command === 'revert') {
            // Revertir seeders
            await revertAllSeeders(dataSource);
        } else if (command && command !== 'all') {
            // Ejecutar seeder específico
            await runSeeder(dataSource, command);
        } else {
            // Ejecutar todos los seeders
            await runAllSeeders(dataSource);
        }

        console.log('');
        console.log('Proceso completado exitosamente');
    } catch (error) {
        console.error('');
        console.error('Error ejecutando seeders:', error);
        process.exit(1);
    } finally {
        // Cerrar conexión
        if (dataSource.isInitialized) {
            await dataSource.destroy();
            console.log('Conexión cerrada');
        }
    }
}

// Ejecutar
main();
