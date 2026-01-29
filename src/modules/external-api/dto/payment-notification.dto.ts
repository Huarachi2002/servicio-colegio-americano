import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, ValidateNested, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para notificación de pago desde servicio externo (banco)
 * Soporta pagos de múltiples cuotas de múltiples hijos de un mismo padre
 */
export class PaymentNotificationDto {
    @IsString()
    @IsOptional()
    transactionId?: string;  // ID único del banco (para idempotencia)

    @IsString()
    @IsNotEmpty()
    parentCardCode: string;  // CardCode del padre (socio de negocio)

    @IsString()
    @IsNotEmpty()
    currency: string;  // BOB o USD

    @IsDateString()
    paymentDate: string;  // Fecha del pago (YYYY-MM-DD)

    @IsOptional()
    @IsString()
    receiptNumber?: string;  // Número de recibo del banco

    @IsOptional()
    @IsString()
    email?: string;  // Email para envío de factura

    @IsOptional()
    @IsString()
    nroFactura?: string;  // Número de factura emitida

    @IsOptional()
    @IsString()
    cuf?: string;  // Código Único de Factura

    @IsNumber()
    paymentMethod: number;  // Método de pago SIN (1=QR, 2=Tarjeta, etc.)

    @IsArray()
    @ArrayMinSize(1, {message: 'Debe incluir al menos un estudiante'})
    @ValidateNested({ each: true })
    @Type(() => StudentPaymentDetail)
    students: StudentPaymentDetail[];  // Estudiantes con sus líneas a pagar
}

/**
 * Detalle de pago por estudiante
 */
export class StudentPaymentDetail {
    @IsString()
    @IsNotEmpty()
    studentCode: string;  // CntctCode del estudiante

    @IsArray()
    @ArrayMinSize(1, {message: 'Debe incluir al menos una línea de orden'})
    @ValidateNested({ each: true })
    @Type(() => OrderLineDto)
    orderLines: OrderLineDto[];  // Líneas de orden a facturar
}

/**
 * DTO para líneas de orden de venta
 */
export class OrderLineDto {
    @IsNumber({}, {message: 'orderDocEntry debe ser un número'})
    @IsNotEmpty({message: 'orderDocEntry es obligatorio'})
    orderDocEntry: number;  // DocEntry de ORDR (idTransaccion)

    @IsNumber({}, {message: 'lineNum debe ser un número'})
    @IsNotEmpty({message: 'lineNum es obligatorio'})
    lineNum: number;  // LineNum en RDR1

    @IsNumber({}, {message: 'amount debe ser un número'})
    @IsNotEmpty({message: 'amount es obligatorio'})
    amount: number;  // Amount en RDR1
}

/**
 * Helper para consolidar orderLines de múltiples estudiantes
 */
export function consolidateOrderLines(students: StudentPaymentDetail[]): OrderLineDto[] {
    return students.flatMap(student => student.orderLines);
}

/**
 * Helper para obtener códigos de estudiantes como string separado por comas
 */
export function getStudentCodesString(students: StudentPaymentDetail[]): string {
    return students.map(s => s.studentCode).join(',');
}

/**
 * Helper para generar fingerprint único del pago (idempotencia sin transactionId)
 * Genera un hash basado en: parentCardCode + paymentDate + amount + orderLines
 */
export function generatePaymentFingerprint(dto: PaymentNotificationDto, totalAmount: number): string {
    const crypto = require('crypto');
    
    // Ordenar students y orderLines para consistencia
    const sortedStudents = [...dto.students].sort((a, b) => a.studentCode.localeCompare(b.studentCode));
    const orderLinesStr = sortedStudents
        .map(s => s.orderLines
            .sort((a, b) => a.orderDocEntry - b.orderDocEntry || a.lineNum - b.lineNum)
            .map(l => `${l.orderDocEntry}-${l.lineNum}-${l.amount}`)
            .join('|')
        )
        .join('||');
    
    const fingerprintData = [
        dto.parentCardCode,
        dto.paymentDate,
        totalAmount.toFixed(2),
        dto.currency,
        orderLinesStr,
    ].join(':');
    
    return crypto.createHash('sha256').update(fingerprintData).digest('hex');
}

/**
 * DTO para consulta de deudores por documento
 */
export class DebtorQueryDto {
    @IsString()
    @IsNotEmpty()
    document: string;  // CI/NIT del padre
}
