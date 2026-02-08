import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { MobileUser } from './mobile-user.entity';

@Entity('devices')
export class Device {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'token' })
    token: string;

    @Column({ name: 'token_fcm' })
    tokenFcm: string;

    @Column({ nullable: true, name: 'entity_id' })
    entityId: number; // Puede ser el ID del padre, empleado o estudiante asociado a este dispositivo

    @Column({ nullable: true, name: 'entity_type' })
    entityType: string; // Puede ser 'Father', 'Employee' o 'Student' para identificar el tipo de entidad asociada
    
    // Relacion 1 a 1 con mobile user
    @OneToOne(() => MobileUser)
    @JoinColumn({ name: 'mobile_user_id' })
    mobileUser: MobileUser;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
