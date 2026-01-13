import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsIn, Min, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para notificación de pago desde servicio externo (banco)
 */
export class PaymentNotificationDto {
    @IsString()
    @IsNotEmpty()
    transactionId: string;  // ID único del banco (para idempotencia)

    @IsString()
    @IsNotEmpty()
    studentCode: string;  // CntctCode del estudiante

    @IsNumber()
    @Min(0.01)
    amount: number;  // Monto pagado

    @IsString()
    @IsIn(['USD', 'BOB'])
    currency: string;

    @IsDateString()
    paymentDate: string;  // Fecha del pago (YYYY-MM-DD)

    @IsOptional()
    @IsString()
    receiptNumber?: string;  // Número de recibo del banco

    @IsString()
    razonSocial: string;  

    @IsString()
    nit: string;
    
    @IsOptional()
    @IsString()
    email: string;  
    
    @IsOptional()
    @IsString()
    cuf?: string;         
    
    @IsOptional()
    @IsString()
    cufd?: string;        
    
    @IsNumber()
    sinPaymentMethod: number; 

    @IsNumber()
    @IsOptional()
    documentTypeIdentity: number;

    @IsOptional()
    @IsString()
    complement?: string; 

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderLineDto)
    orderLines?: OrderLineDto[];  // Líneas de orden a facturar
}

/**
 * DTO para líneas de orden de venta
 */
export class OrderLineDto {
    @IsNumber()
    orderDocEntry: number;  // DocEntry de ORDR (idTransaccion)

    @IsNumber()
    lineNum: number;  // LineNum en RDR1
}

/**
 * DTO para consulta de deudores por documento
 */
export class DebtorQueryDto {
    @IsString()
    @IsNotEmpty()
    document: string;  // CI/NIT del padre
}
