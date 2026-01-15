import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Entidad para clientes de API externos (bancos, cooperativas, etc.)
 * Almacena las credenciales y configuración de acceso
 */
@Entity('api_clients')
export class ApiClient {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 100 })
    name: string;  // "BNB", "Banco Union", etc.

    // @Column({ name: 'api_key', unique: true, length: 64 })
    // apiKey: string;  // UUID o token generado

    @Column({ name: 'api_secret', length: 128 })
    apiSecret: string;  // Hash del secret

    @Column({ name: 'allowed_ips', type: 'text', nullable: true })
    allowedIps: string;  // IPs permitidas separadas por coma (opcional)

    @Column({ type: 'bit', default: true })
    active: boolean;

    @Column({ name: 'rate_limit', default: 100 })
    rateLimit: number;  // Requests por minuto

    // @Column({ name: 'cuenta_contable_sap', type: 'text'})
    // cuentaContableSap: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    /**
     * Helper para obtener IPs permitidas como array
     */
    getAllowedIpsArray(): string[] {
        return this.allowedIps ? this.allowedIps.split(',').map(ip => ip.trim()) : [];
    }
}
