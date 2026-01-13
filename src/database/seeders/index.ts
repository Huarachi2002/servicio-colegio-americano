import { DataSource } from 'typeorm';
import { UserSeeder } from './user.seeder';
import { RolSeeder } from './rol.seeder';

const seeders = [
    UserSeeder,
    RolSeeder,
];

/**
 * Ejecutar todos los seeders
 */
export async function runAllSeeders(dataSource: DataSource): Promise<void> {
    console.log('Iniciando proceso de seeding...');
    console.log('='.repeat(50));
    console.log('');

    for (const SeederClass of seeders) {
        const seeder = new SeederClass();
        const seederName = SeederClass.name;

        console.log(`Ejecutando ${seederName}...`);
        try {
            await seeder.run(dataSource);
            console.log(`${seederName} completado`);
        } catch (error) {
            console.error(`Error en ${seederName}:`, error.message);
            throw error;
        }
        console.log('');
    }

    console.log('='.repeat(50));
    console.log('Proceso de seeding completado exitosamente');
}

/**
 * Revertir todos los seeders (en orden inverso)
 */
export async function revertAllSeeders(dataSource: DataSource): Promise<void> {
    console.log('Revirtiendo seeders...');
    console.log('='.repeat(50));
    console.log('');

    // Ejecutar en orden inverso
    for (const SeederClass of seeders.reverse()) {
        const seeder = new SeederClass();
        const seederName = SeederClass.name;

        if (typeof seeder.revert === 'function') {
            console.log(`Revirtiendo ${seederName}...`);
            try {
                await seeder.revert(dataSource);
                console.log(`${seederName} revertido`);
            } catch (error) {
                console.error(`Error revirtiendo ${seederName}:`, error.message);
            }
            console.log('');
        }
    }

    console.log('='.repeat(50));
    console.log('Seeders revertidos');
}

/**
 * Ejecutar un seeder específico
 */
export async function runSeeder(
    dataSource: DataSource,
    seederName: string,
): Promise<void> {
    const SeederClass = seeders.find((s) => s.name === seederName);

    if (!SeederClass) {
        throw new Error(`Seeder "${seederName}" no encontrado`);
    }

    console.log(`Ejecutando ${seederName}...`);
    const seeder = new SeederClass();
    await seeder.run(dataSource);
    console.log(`${seederName} completado`);
}
