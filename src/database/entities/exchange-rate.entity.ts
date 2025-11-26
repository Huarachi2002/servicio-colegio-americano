import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('exchange_rates')
export class ExchangeRate {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'exchange_rate', type: 'decimal', precision: 10, scale: 4 })
    exchangeRate: number;

    @Column({ type: 'boolean', default: true })
    enabled: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
