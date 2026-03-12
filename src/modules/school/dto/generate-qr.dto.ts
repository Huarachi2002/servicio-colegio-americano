import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { PaymentInformationDto } from './payment-information.dto';

export class GenerateQrDto {
    @IsString()
    @IsNotEmpty()
    erp_code: string;

    @IsObject()
    @IsNotEmpty()
    payment_information: PaymentInformationDto;

    @IsString()
    @IsOptional()
    bank_name?: string = 'BG';
}
