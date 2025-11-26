import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('devices')
export class Device {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'token' })
    token: string;

    @Column({ name: 'token_fcm' })
    tokenFcm: string;

    @Column({ nullable: true, name: 'entity_id' })
    entityId: number;

    @Column({ nullable: true, name: 'entity_type' })
    entityType: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
