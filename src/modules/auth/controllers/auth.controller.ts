import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post } from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { LoginDto } from "../dto/login.dto";
import { ApiResponse } from "src/common/interfaces/api-response.interface";

@Controller()
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Get('health')
    healthCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'dms2-nest',
        };
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Headers('device-token') deviceToken?: string): Promise<ApiResponse> {

        try {
            // Intenta autenticas al usuario
            const user = await this.authService.attemptLogin(loginDto);

            if (!user) {
                return {
                    status: 'error',
                    message: 'Invalid credentials',
                    data: null
                };
            }

            const data = await this.authService.sendLoginResponse(user, deviceToken);
            return {
                status: 'success',
                message: 'Login successful',
                data,
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                'Autentication failed',
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }


}
