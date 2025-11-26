import { IsString } from 'class-validator';

export class LoginDto {

    @IsString()
    username: string;

    @IsString()
    password: string;

    @IsString()
    deviceToken: string;
}
