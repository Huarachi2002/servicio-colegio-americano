import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { User } from './users.entity';

@Entity('roles')
export class Rol {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToMany(() => User, (user) => user.rol)
    users: User[];

    @Column()
    description: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
