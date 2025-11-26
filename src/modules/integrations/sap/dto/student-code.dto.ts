import { IsString, IsNotEmpty, Matches } from 'class-validator';

/**
 * DTO para validar código ERP del estudiante
 */
export class StudentCodeDto {
    @IsString()
    @IsNotEmpty({ message: 'El código ERP del estudiante es requerido' })
    @Matches(/^\d+$/, {
        message: 'El código ERP debe ser numérico',
    })
    studentErpCode: string;
}
