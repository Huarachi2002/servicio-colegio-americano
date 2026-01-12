import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncSingleUserDto {
    @IsString()
    cardCode: string;
}

export class SyncUsersFilterDto {
    @IsOptional()
    @IsString()
    cardType?: string; // 'C' = Customer/Cliente (Padre)

    @IsOptional()
    @IsString()
    validFor?: string; // 'Y' = Activo, 'N' = Inactivo

    @IsOptional()
    @IsString()
    groupCode?: string; // Filtrar por grupo de socio de negocio

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    @Max(1000)
    limit?: number; // Límite de registros a procesar

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    offset?: number; // Offset para paginación

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    background?: boolean; // Procesar en background

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(10)
    @Max(100)
    batchSize?: number; // Tamaño del lote para procesamiento (default: 50)
}
