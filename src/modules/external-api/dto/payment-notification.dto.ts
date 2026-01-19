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

    @IsNumber()
    paymentMethod: number;  // Método de pago SIN (1=QR, 2=Tarjeta, etc.)

    @IsArray()
    @ArrayMinSize(1)
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
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => OrderLineDto)
    orderLines: OrderLineDto[];  // Líneas de orden a facturar
}

/**
 * DTO para líneas de orden de venta
 */
export class OrderLineDto {
    @IsNumber()
    orderDocEntry: number;  // DocEntry de ORDR (idTransaccion)

    @IsNumber()
    lineNum: number;  // LineNum en RDR1

    @IsNumber()
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
 * DTO para consulta de deudores por documento
 */
export class DebtorQueryDto {
    @IsString()
    @IsNotEmpty()
    document: string;  // CI/NIT del padre
}
