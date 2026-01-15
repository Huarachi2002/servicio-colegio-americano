import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateUser {
    @IsString()
    name: string;

    @IsString()
    username: string;

    @IsString()
    @IsOptional()
    email: string;

    @IsString()
    password: string;

    @IsString()
    @IsOptional()
    type: string;

    @IsNumber()
    roleId: number;
}
