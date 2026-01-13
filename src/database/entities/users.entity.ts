import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { Rol } from './roles.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    username: string;

    @Column({ nullable: true })
    email: string;

    @Column()
    password: string;

    @Column()
    type: string;

    @Column({ nullable: true })
    api_token: string;

    @ManyToOne(() => Rol, (rol) => rol.users)
    @JoinColumn({ name: 'role_id' })
    rol: Rol;

    @Column({ type: 'int', default: 1 })
    state: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
