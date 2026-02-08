import { IsNumber, IsOptional, IsString } from "class-validator";

export class DeviceStoreDto {

    @IsString()
    token: string;

    @IsString()
    token_fcm: string;

    @IsNumber()
    @IsOptional()
    entity_id?: number;

    @IsString()
    @IsOptional()
    entity_type?: string;

}