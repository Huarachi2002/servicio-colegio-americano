import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Rol } from '../entities/roles.entity';

export class RolSeeder {

    public async run(dataSource: DataSource): Promise<void> {
        const rolRepository = dataSource.getRepository(Rol);

        // Verificar si ya existen roles
        const existingRols = await rolRepository.count();
        if (existingRols > 0) {
            console.log('Ya existen roles en la base de datos. Saltando seeder de roles...');
            return;
        }

        console.log('Creando roles...');

        const roles = [
            {
                description: 'Administrador',
            },
            {
                description: 'Profesor',
            },
            {
                description: 'Coordinador',
            }
        ];

        // Insertar roles
        const createdRoles = await rolRepository.save(roles);

        console.log(`${createdRoles.length} roles creados exitosamente`);
    }

    public async revert(dataSource: DataSource): Promise<void> {
        const rolRepository = dataSource.getRepository(Rol);

        console.log('Revirtiendo seeder de roles...');

        // Eliminar todos los roles
        await rolRepository.clear();

        console.log('Roles eliminados');
    }
}
