import { Body, Controller, Get, Headers, HttpException, HttpStatus, Logger, Post } from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { LoginDto } from "../dto/login.dto";
import { ApiResponseMovil } from "src/common/interfaces/api-response-movil.interface";
import { ApiResponseWeb } from "src/common/interfaces/api-response-web.interface";

@Controller()
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    constructor(
        private readonly authService: AuthService
    ) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Headers('device-token') deviceToken?: string): Promise<ApiResponseMovil> {

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

    @Post('login-web')
    async loginWeb(@Body() loginDto: LoginDto): Promise<ApiResponseWeb<any>> {
        this.logger.log('Received web login request for username: ' + loginDto.username);
        try {
            const apiToken = await this.authService.loginWeb(loginDto);
            return {
                success: true,
                message: 'Login successful',
                data: { apiToken }
            }
        } catch (error) {
            this.logger.error('Credenciales Invalidas');
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }
}
