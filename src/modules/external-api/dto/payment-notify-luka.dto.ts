import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, ValidateNested, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentNotifyLukaDto {
    @IsString()
    @IsNotEmpty()
    idPaymentNotify: string;

    @IsString()
    @IsNotEmpty()
    parentCardCode: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CuotaLukaDto)
    cuotas: CuotaLukaDto[];
}

export class CuotaLukaDto {
    @IsString()
    @IsNotEmpty()
    numeroCuota: string;

    @IsString()
    @IsNotEmpty()
    periodo: string;

    @IsString()
    @IsNotEmpty()
    fechaVencimiento: string;

    @IsString()
    @IsNotEmpty()
    montoCuota: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CuotaDetalleLukaDto)
    cuotaDetalle: CuotaDetalleLukaDto[];
}

export class CuotaDetalleLukaDto {
    @IsString()
    @IsNotEmpty()
    nombreEstudiante: string;

    @IsString()
    @IsNotEmpty()
    codigoEstudiante: string;

    @IsString()
    @IsNotEmpty()
    idTransaccion: string;

    @IsString()
    @IsNotEmpty()
    linNum: string;

    @IsString()
    @IsNotEmpty()
    montoDeuda: string;
}
