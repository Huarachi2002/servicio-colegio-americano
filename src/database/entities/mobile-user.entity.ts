import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { Device } from './device.entity';

@Entity('mobile_users')
export class MobileUser {
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

    @Column({ name: 'entity_id' })
    entity_id: number; // id del padre - empleado - estudiante

    @Column({ name: 'entity_type' })
    entity_type: string; // 'father' | 'employee' | 'student'

    // @Column({ name: 'user_type' })
    // user_type: number;

    @OneToOne(() => Device)
    @JoinColumn({ name: 'device_id' })
    device: Device;

    @Column({ nullable: true })
    api_token: string;

    @Column({ type: 'int', default: 1 })
    state: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
