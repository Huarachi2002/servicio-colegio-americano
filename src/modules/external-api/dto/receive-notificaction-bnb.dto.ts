import { IsNumber, IsString } from "class-validator";

export class ReceiveNotificationBnbDto {
    @IsString()
    QRId: string;

    @IsString()
    Gloss: string;

    @IsNumber()
    sourceBankId: number;

    @IsString()
    originName: string;

    @IsString()
    VoucherId: string;

    @IsString()
    TransactionDateTime: string;

    @IsString()
    AdditionalData: any;
}