import { IsString } from "class-validator";

export class DeviceStoreDto {

    @IsString()
    token: string;

    @IsString()
    token_fcm: string;

}