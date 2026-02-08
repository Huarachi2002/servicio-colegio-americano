import { Body, Controller, Get, Headers, HttpException, HttpStatus, Logger, Post } from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { LoginDto } from "../dto/login.dto";
import { ApiResponseMovil } from "src/common/interfaces/api-response-movil.interface";
import { ApiResponseWeb } from "src/common/interfaces/api-response-web.interface";
import { CustomLoggerService } from "src/common/logger";

@Controller()
export class AuthController {
    private readonly logger: CustomLoggerService;
    constructor(
        private readonly authService: AuthService,
        private readonly customLogger: CustomLoggerService,
    ) { 
        this.logger = this.customLogger.setContext(AuthController.name);
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Headers('device-token') deviceToken?: string): Promise<ApiResponseMovil> {

        try {
            // Intenta autenticas al usuario
            const user = await this.authService.attemptLogin(loginDto);
            this.logger.log('Login attempt for username: ' + loginDto.username);
            if (!user) {
                return {
                    status: 'error',
                    message: 'Invalid credentials',
                    data: null
                };
            }
            const data = await this.authService.sendLoginResponse(user, deviceToken);
            this.logger.log('Login response prepared successfully for user: ' + user.username);
            return {
                status: 'success',
                message: 'Login successful',
                data,
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error('Error during login process: ' + error.message);

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
            this.logger.error('Credenciales Invalidas: ' + error.message);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }
}
