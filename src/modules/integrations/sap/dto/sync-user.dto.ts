import { IsOptional, IsString } from 'class-validator';

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
}
