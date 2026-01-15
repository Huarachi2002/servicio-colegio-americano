
export interface ExternalApiResponse<T> {
    success: boolean;
    code: string;  // 'OK', 'NOT_FOUND', 'INVALID_DATA', 'ALREADY_PROCESSED', etc.
    message: string;
    timestamp: string;
    requestId: string;  // Para trazabilidad
    data: T | null;
}

export interface DebtorInfo {
    parentCode: string;      // CardCode del padre
    parentName: string;
    parentDocument: string;  // NIT/CI
    students: {
        studentCode: string;  // CntctCode
        studentName: string;
        hasPendingDebts: boolean;
    }[];
}

export interface DebtListItem {
    debtId: string;          // idTransaccion (DocEntry de ORDR)
    lineNum: number;         // LineNum en RDR1
    concept: string;         // ConceptoPago (ItemCode)
    period: string;          // PeriodoPago
    amount: number;
    currency: string;
    dueDate?: string;
    isPriority: boolean;
}

export interface DebtDetail {
    debtId: string;
    lineNum: number;
    studentCode: string;
    studentName: string;
    parentCode: string;
    concept: string;
    period: string;
    baseAmount: number;
    fineAmount: number;
    discountAmount: number;
    totalAmount: number;
    currency: string;
    exchangeRate: number;
    invoiceData: {
        nit: string;
        businessName: string;
        canModify: boolean;
    };
}

export interface PaymentConfirmation {
    internalId: number;       // ID interno del sistema (PaymentNotification.id)
    transactionId: string;    // ID del banco (echo)
    status: 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'ALREADY_PROCESSED';
    processedAt?: string;
    sapInvoiceDocNum?: number;
    sapPaymentDocNum?: number;
    message: string;
}
