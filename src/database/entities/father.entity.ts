import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Student } from './student.entity';

@Entity('fathers')
export class Father {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'name' })
    name: string;

    @Column({ nullable: true, name: 'email' })
    email: string;

    @Column({ name: 'erp_code' })
    erpCode: string;

    @Column({ type: 'int', default: 1 })
    state: number;

    @OneToMany(() => Student, (student) => student.father)
    students: Student[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
