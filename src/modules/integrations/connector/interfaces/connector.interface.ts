export interface PaymentNotificationRequest {
    transactionId?: string;  // ID único del banco (para idempotencia)
    parentCardCode: string;  // CardCode del padre (socio de negocio)
    transferAccount: string;  // Cuenta contable de transferencia
    currency: string;  // BOB o USD
    paymentDate: string;  // Fecha del pago (YYYY-MM-DD)
    receiptNumber?: string;  // Número de recibo del banco
    email?: string;  // Email para envío de factura
    nroFactura?: string;  // Número de factura emitida
    cuf?: string;  // Código Único de Factura
    paymentMethod: number;  // Método de pago SIN (1=QR, 2=Tarjeta, etc.)
    students: StudentPaymentDetail[];  // Estudiantes con sus líneas a pagar
} 

export interface StudentPaymentDetail {
    studentCode: string;  // CntctCode del estudiante
    orderLines: OrderLine[];  // Líneas de orden a facturar
}

export interface OrderLine {
    orderDocEntry: number;
    lineNum: number;
    amount: number;
}

