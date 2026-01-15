import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateUser {
    @IsString()
    @IsOptional()
    name: string;

    @IsString()
    @IsOptional()
    username: string;

    @IsString()
    @IsOptional()
    email: string;

    @IsString()
    @IsOptional()
    password: string;

    @IsString()
    @IsOptional()
    type: string;

    @IsNumber()
    @IsOptional()
    roleId: number;
}
