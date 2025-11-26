import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class GenerateQrDto {
    @IsString()
    @IsNotEmpty()
    erp_code: string;

    @IsObject()
    @IsNotEmpty()
    debt_information: any; // DebtConsultationResponse object
}
