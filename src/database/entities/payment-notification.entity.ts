import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ApiClient } from './api-client.entity';

/**
 * Entidad para registrar notificaciones de pago de servicios externos
 * Almacena el estado de procesamiento y sincronización con SAP
 * Soporta pagos de múltiples cuotas de múltiples hijos de un mismo padre
 */
@Entity('payment_notifications')
export class PaymentNotification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'external_transaction_id', unique: true, length: 100 })
    externalTransactionId: string;  // ID único del banco (para idempotencia)

    @Column({ name: 'student_codes', length: 500 })
    studentCodes: string;  // CntctCodes de estudiantes separados por coma (ej: "123,456,789")

    @Column({ name: 'student_count', default: 1 })
    studentCount: number;  // Cantidad de estudiantes en el pago

    @Column({ name: 'parent_card_code', length: 50 })
    parentCardCode: string;  // CardCode del padre (socio de negocio)

    @Column({ name: 'students_detail', type: 'text', nullable: true })
    studentsDetail: string;  // JSON con detalle de estudiantes y líneas pagadas

    @Column({ name: 'debt_reference', length: 100, nullable: true })
    debtReference: string;  // idTransaccion de SAP (DocEntry de ORDR)

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ length: 3 })
    currency: string; // BOB

    @Column({ name: 'payment_date', type: 'date' })
    paymentDate: Date;

    @Column({ name: 'receipt_number', length: 100, nullable: true })
    receiptNumber: string;  // Número de recibo del banco

    @Column({ name: 'api_client_id' })
    apiClientId: number;

    @ManyToOne(() => ApiClient)
    @JoinColumn({ name: 'api_client_id' })
    apiClient: ApiClient;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'RECEIVED'
    })
    status: string;  // RECEIVED, PROCESSING, PROCESSED, FAILED

    @Column({ name: 'sap_sync_status', length: 20, default: 'PENDING' })
    sapSyncStatus: string;  // PENDING, SYNCED, ERROR

    @Column({ name: 'sap_invoice_doc_entry', nullable: true })
    sapInvoiceDocEntry: number;  // DocEntry de la Factura creada

    @Column({ name: 'sap_invoice_doc_num', nullable: true })
    sapInvoiceDocNum: number;  // DocNum de la Factura creada

    @Column({ name: 'sap_payment_doc_entry', nullable: true })
    sapPaymentDocEntry: number;  // DocEntry del Pago Recibido

    @Column({ name: 'sap_payment_doc_num', nullable: true })
    sapPaymentDocNum: number;  // DocNum del Pago Recibido

    @Column({ name: 'sap_sync_error', type: 'text', nullable: true })
    sapSyncError: string;  // Mensaje de error si falló

    @Column({ name: 'raw_payload', type: 'text', nullable: true })
    rawPayload: string;  // JSON del request original

    @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
    processedAt: Date;  // Fecha/hora cuando se procesó completamente

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
