import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { lastValueFrom } from "rxjs";
import { CustomLoggerService } from "src/common/logger";


@Injectable()
export class BnbService {
    private readonly logger: CustomLoggerService;
    private token: string = null;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly customLogger: CustomLoggerService,
    ) {
        this.logger = this.customLogger.setContext(BnbService.name);
    }

    async authenticate(): Promise<string> {
        const url = `${this.configService.get('BNB_API_URL')}/ClientAuthentication.API/api/v1/auth/token`;
        const body = {
            accountId: this.configService.get('BNB_ACCOUNT_ID'),
            authorizationId: this.configService.get('BNB_AUTH_ID'),
        };
        const startTime = Date.now();

        try {
            this.logger.logIntegrationProcess('BNB_AUTH', 'authenticate', 'START', {
                url,
                accountId: body.accountId,
            });

            this.logger.log(`Autenticando con BNB: ${url}`);
            this.logger.debug(`Credenciales: accountId=${body.accountId}`);

            const response = await lastValueFrom(this.httpService.post(url, body));
            const duration = Date.now() - startTime;

            this.logger.logApiCall(
                'BNB',
                'POST',
                url,
                { accountId: body.accountId },
                response.data,
                response.status,
                duration,
                false,
            );

            if (response.data.success) {
                this.token = response.data.message;
                this.logger.logIntegrationProcess('BNB_AUTH', 'authenticate', 'SUCCESS', {
                    duration: `${duration}ms`,
                });
                this.logger.log('Autenticación exitosa con BNB');
                return this.token;
            } else {
                this.logger.logIntegrationProcess('BNB_AUTH', 'authenticate', 'ERROR', {
                    response: response.data,
                    duration: `${duration}ms`,
                });
                this.logger.error('BNB rechazó la autenticación:', JSON.stringify(response.data));
                throw new Error(`Fallo la autenticacion con BNB: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Error autenticando con BNB');
            
            if (error.response) {
                this.logger.logApiCall(
                    'BNB',
                    'POST',
                    url,
                    { accountId: body.accountId },
                    error.response.data,
                    error.response.status,
                    duration,
                    true,
                );
                this.logger.error(`Status: ${error.response.status}`);
                this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
                this.logger.error(`Headers: ${JSON.stringify(error.response.headers)}`);
            } else if (error.request) {
                this.logger.logApiCall('BNB', 'POST', url, { accountId: body.accountId }, null, null, duration, true);
                this.logger.error('No se recibió respuesta del servidor BNB');
                this.logger.error(`Error: ${error.message}`);
            } else {
                this.logger.error(`Error: ${error.message}`, error.stack);
            }

            this.logger.logIntegrationProcess('BNB_AUTH', 'authenticate', 'ERROR', {
                error: error.message,
                duration: `${duration}ms`,
            });
            
            throw new HttpException(
                `Error de comunicación bancaria: ${error.message}`,
                HttpStatus.BAD_GATEWAY
            );
        }
    }

    async generateQR(
        additionalData: any,
        amount: number | string,
        gloss: string,
        currency: string = 'BOB',
        expirationDate: string
    ): Promise<any> {
        // Siempre autenticar antes de generar QR para asegurar token válido
        this.logger.log('Autenticando antes de generar QR...');
        await this.authenticate();

        // Asegurar que amount sea numérico
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        
        if (isNaN(numericAmount) || numericAmount <= 0) {
            this.logger.error(`Monto inválido: ${amount}`);
            this.logger.logIntegrationProcess('BNB_QR', 'generateQR', 'ERROR', {
                error: 'Monto inválido',
                amount,
            });
            throw new HttpException(
                'El monto debe ser un número mayor a 0',
                HttpStatus.BAD_REQUEST
            );
        }

        const url = `${this.configService.get('BNB_API_URL')}/QRSimple.API/api/v1/main/getQRWithImageAsync`;
        const body = {
            currency,
            gloss,
            amount: numericAmount,
            singleUse: true,
            expirationDate,
            additionalData: JSON.stringify(additionalData),
            destinationAccountId: currency === 'USD' ? 2 : 1,
        };
        const startTime = Date.now();

        try {
            this.logger.logIntegrationProcess('BNB_QR', 'generateQR', 'START', {
                url,
                currency,
                amount: numericAmount,
                gloss,
                expirationDate,
            });

            this.logger.log('Generando QR con datos: ' + JSON.stringify(body));

            const headers = { Authorization: `Bearer ${this.token}` };
            const response = await lastValueFrom(this.httpService.post(url, body, { headers }));
            const duration = Date.now() - startTime;

            this.logger.logApiCall(
                'BNB',
                'POST',
                url,
                body,
                { success: response.data.success, id: response.data.id },
                response.status,
                duration,
                false,
            );

            this.logger.log('QR generado exitosamente');
            this.logger.debug('Respuesta BNB: ' + JSON.stringify(response.data));

            if (response.data.success && response.data.qr) {
                this.logger.logIntegrationProcess('BNB_QR', 'generateQR', 'SUCCESS', {
                    qrId: response.data.id,
                    duration: `${duration}ms`,
                });
                return response.data;
            } else {
                this.logger.logIntegrationProcess('BNB_QR', 'generateQR', 'ERROR', {
                    response: response.data,
                    duration: `${duration}ms`,
                });
                this.logger.error('BNB respondió sin éxito:', JSON.stringify(response.data));
                throw new HttpException(
                    `BNB no generó QR: ${response.data.message || 'Error desconocido'}`,
                    HttpStatus.BAD_GATEWAY
                );
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Error generando QR');
            
            // Log detallado del error
            if (error.response) {
                this.logger.logApiCall(
                    'BNB',
                    'POST',
                    url,
                    body,
                    error.response.data,
                    error.response.status,
                    duration,
                    true,
                );
                this.logger.error(`Status: ${error.response.status}`);
                this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
                
                // Si es error 401, el token no es válido
                if (error.response.status === 401) {
                    this.logger.error('Error 401: Token de BNB no válido o expirado');
                    this.logger.logIntegrationProcess('BNB_QR', 'generateQR', 'ERROR', {
                        error: 'Token inválido o expirado',
                        status: 401,
                        duration: `${duration}ms`,
                    });
                    throw new HttpException(
                        'Error de autenticación con BNB. Verifique las credenciales.',
                        HttpStatus.BAD_GATEWAY
                    );
                }
            } else if (error.request) {
                this.logger.logApiCall('BNB', 'POST', url, body, null, null, duration, true);
                this.logger.error('No se recibió respuesta de BNB');
                this.logger.error(`Error: ${error.message}`);
            } else {
                this.logger.error(`Error: ${error.message}`, error.stack);
            }

            this.logger.logIntegrationProcess('BNB_QR', 'generateQR', 'ERROR', {
                error: error.message,
                duration: `${duration}ms`,
            });
            
            // Si ya es HttpException, relanzarla
            if (error instanceof HttpException) {
                throw error;
            }
            
            throw new HttpException(
                `No se pudo generar el QR bancario: ${error.message}`,
                HttpStatus.BAD_GATEWAY
            );
        }
    }
}