import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Cycle } from './cycle.entity';

@Entity('grades')
export class Grade {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ name: 'erp_code' })
    erpCode: string;

    @Column()
    cycle_id: number;

    @ManyToOne(() => Cycle, (cycle) => cycle.grades)
    @JoinColumn({ name: 'cycle_id' })
    cycle: Cycle;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
