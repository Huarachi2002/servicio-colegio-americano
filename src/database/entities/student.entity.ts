import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Father } from './father.entity';

@Entity('students')
export class Student {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ name: 'erp_code' })
    erpCode: string;

    @Column()
    email: string;

    @Column({ name: 'invoce_name', default: 'SIN NOMBRE' })
    invoceName: string;

    @Column({ default: '0' })
    nit: string;

    @Column({ name: 'father_id' })
    father_id: number;

    @Column({ name: 'grade_id', nullable: true })
    gradeId: number;

    @Column({ name: 'parallel_id', nullable: true })
    parallelId: number;

    @Column({ type: 'int', default: 1 })
    state: number;

    @ManyToOne(() => Father, (father) => father.students)
    @JoinColumn({ name: 'father_id' })
    father: Father;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
