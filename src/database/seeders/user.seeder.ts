import { DataSource } from 'typeorm';
import { User } from '../entities/users.entity';
import * as bcrypt from 'bcrypt';

export class UserSeeder {

    public async run(dataSource: DataSource): Promise<void> {
        const userRepository = dataSource.getRepository(User);

        // Verificar si ya existen usuarios
        const existingUsers = await userRepository.count();
        if (existingUsers > 0) {
            console.log('Ya existen usuarios en la base de datos. Saltando seeder de usuarios...');
            return;
        }

        console.log('Creando usuarios de prueba...');

        const hashedPassword = await bcrypt.hash('password123', 10);

        const rolAdm = await dataSource.getRepository('Rol').findOneBy({ description: 'Administrador' });
        // Usuarios de prueba
        const users = [
            {
                name: 'Administrador Sistema',
                username: 'admin',
                email: 'admin@colegioamericano.edu.bo',
                password: hashedPassword,
                type: rolAdm.description.toLowerCase(),
                rol: rolAdm,
                state: 1,
            },
        ];

        // Insertar usuarios
        const createdUsers = await userRepository.save(users);

        console.log(`${createdUsers.length} usuarios creados exitosamente`);
        console.log('');
        console.log('Todos los usuarios');
    }

    /**
     * Revertir seeder (opcional)
     * Elimina todos los usuarios creados por este seeder
     */
    public async revert(dataSource: DataSource): Promise<void> {
        const userRepository = dataSource.getRepository(User);

        console.log('Revirtiendo seeder de usuarios...');

        await userRepository.clear();

        console.log('Usuarios eliminados');
    }
}
