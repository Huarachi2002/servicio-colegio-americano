export interface CreateInvoiceDto {
    transactionId: string;
    email: string;
    nroFactura: string;
    cuf: string;
    paymentMethod: number;
    parentCardCode: string;
    docDate: string;
    bankName: string;
    externalReference: string;
    orderLines: {
        orderDocEntry: number;
        lineNum: number;
    }[];
}

export interface CreatePaymentDto {
    parentCardCode: string;
    paymentDate: string;
    amount: number;
    externalReference: string;
    invoiceDocEntry: number;

    transferAccount: string;
}

export interface SapDocumentResponse {
    success: boolean;
    docEntry?: number;
    docNum?: number;
    error?: string;
}

export interface PaymentProcessResult {
    success: boolean;
    invoiceDocEntry?: number;
    invoiceDocNum?: number;
    paymentDocEntry?: number;
    paymentDocNum?: number;
    error?: string;
}

export interface ProcessPaymentDto {
    transactionId: string;
    email: string;
    nroFactura: string;
    cuf: string;
    paymentMethod: number;
    transferAccount: string;
    parentCardCode: string;
    paymentDate: string;
    amount: number;
    bankName: string;
    externalReference: string;
    orderLines: {
        orderDocEntry: number;
        lineNum: number;
    }[];
}

/**
 * Interfaz para Socio de Negocio de SAP
 */
export interface SapBusinessPartner {
    CardCode: string;           // Código del Socio de Negocio
    CardName: string;           // Nombre completo
    CardType: string;           // 'C' = Cliente, 'S' = Proveedor, 'L' = Lead
    FederalTaxID: string;       // NIT o Documento de Identidad
    EmailAddress?: string;      // Email
    Phone1?: string;            // Teléfono
    ValidFor: string;              // 'Y' = Válido/Activo, 'N' = Inactivo
    GroupCode?: number;         // Código de grupo
}

/**
 * Interfaz para Persona de Contacto de SAP (Estudiante)
 */
export interface SapContactPerson {
    CardCode: string;           // Código del Socio de Negocio (padre)
    CntctCode: number;          // Código interno de la persona de contacto
    Name: string;               // Nombre completo del estudiante
    E_MailL?: string;           // Email del estudiante
    Tel1?: string;              // Teléfono
    Active: string;             // 'Y' = Activo, 'N' = Inactivo
}

/**
 * Resultado de sincronización de un estudiante
 */
export interface StudentSyncResult {
    studentName: string;
    erpCode: string;
    success: boolean;
    action: 'created' | 'updated' | 'skipped' | 'error';
    message?: string;
    error?: string;
}

/**
 * Resultado de sincronización de un usuario
 */
export interface UserSyncResult {
    cardCode: string;
    cardName: string;
    username: string;
    success: boolean;
    action: 'created' | 'updated' | 'skipped' | 'error';
    message?: string;
    error?: string;
    students?: StudentSyncResult[];  // Agregar estudiantes sincronizados
    studentsCount?: number;           // Cantidad de estudiantes
}

/**
 * Resultado de sincronización masiva
 */
export interface MassSyncResult {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    results: UserSyncResult[];
}

/**
 * Estado de sincronización en background
 */
export enum SyncStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

/**
 * Estado de un job de sincronización
 */
export interface SyncJobState {
    jobId: string;
    status: SyncStatus;
    total: number;
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    startedAt: Date;
    completedAt?: Date;
    errorMessage?: string;
    currentBatch?: number;
    totalBatches?: number;
}