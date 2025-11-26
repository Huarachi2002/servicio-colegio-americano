import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('employees')
export class Employee {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ name: 'middle_name', nullable: true })
    middleName: string;

    @Column({ name: 'last_name', nullable: true })
    lastName: string;

    @Column({ name: 'mothers_last_name', nullable: true })
    mothersLastName: string;

    @Column({ name: 'erp_code', nullable: true })
    erpCode: string;

    @Column({ name: 'address', nullable: true })
    address: string;

    @Column({ name: 'phone', nullable: true })
    phone: string;

    @Column({ name: 'email', nullable: true })
    email: string;

    @Column({ name: 'dni', nullable: true })
    dni: string;

    @Column({ name: 'birthday', nullable: true })
    birthday: Date;

    @Column({ name: 'dni_expiry_date', nullable: true })
    dniExpiryDate: Date;

    @Column({ name: 'manager', default: false })
    manager: boolean;

    @Column({ name: 'state' })
    state: string;

    @Column({ name: 'business_unit_id' })
    businessUnitId: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}