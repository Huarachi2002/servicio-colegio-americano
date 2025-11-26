import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'erp_code' })
    erpCode: string;

    @Column({ name: 'payment_id' })
    paymentId: string;

    @Column({ name: 'expiration_date', type: 'date' })
    expirationDate: Date;

    @Column({ type: 'text' })
    data: string; // JSON string de debt information

    @Column({ type: 'text' })
    qr: string; // QR code string/image

    @Column({ name: 'created_by', default: '1' })
    createdBy: string;

    @Column({ name: 'transaction_id' })
    transactionId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
