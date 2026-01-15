import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { lastValueFrom } from "rxjs";


@Injectable()
export class BnbService {
    private readonly logger = new Logger(BnbService.name);
    private token: string = null;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async authenticate(): Promise<string> {
        try {
            const url = `${this.configService.get('BNB_API_URL')}/ClientAuthentication.API/api/v1/auth/token`;
            const body = {
                accountId: this.configService.get('BNB_ACCOUNT_ID'),
                authorizationId: this.configService.get('BNB_AUTH_ID'),
            };

            this.logger.log(`Autenticando con BNB: ${url}`);
            this.logger.debug(`Credenciales: accountId=${body.accountId}`);

            const response = await lastValueFrom(this.httpService.post(url, body));

            this.logger.log('Respuesta de autenticación BNB:', JSON.stringify(response.data));

            if (response.data.success) {
                this.token = response.data.message;
                this.logger.log('Autenticación exitosa con BNB');
                return this.token;
            } else {
                this.logger.error('BNB rechazó la autenticación:', response.data);
                throw new Error(`Fallo la autenticacion con BNB: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            this.logger.error('Error autenticando con BNB');
            
            if (error.response) {
                this.logger.error(`Status: ${error.response.status}`);
                this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
                this.logger.error(`Headers: ${JSON.stringify(error.response.headers)}`);
            } else if (error.request) {
                this.logger.error('No se recibió respuesta del servidor BNB');
                this.logger.error(`Error: ${error.message}`);
            } else {
                this.logger.error(`Error: ${error.message}`);
            }
            
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

        if (currency === 'U') {
            currency = 'USD';
        }

        // Asegurar que amount sea numérico
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        
        if (isNaN(numericAmount) || numericAmount <= 0) {
            this.logger.error(`Monto inválido: ${amount}`);
            throw new HttpException(
                'El monto debe ser un número mayor a 0',
                HttpStatus.BAD_REQUEST
            );
        }

        try {
            const url = `${this.configService.get('BNB_API_URL')}/QRSimple.API/api/v1/main/getQRWithImageAsync`;

            const body = {
                currency,
                gloss,
                amount: numericAmount,
                singleUse: true,
                expirationDate,
                additionalData: JSON.stringify(additionalData),
                destinationAccountId: currency === 'USD' ? 2 : 1,
            }

            this.logger.log('Generando QR con datos: ', body);

            const headers = { Authorization: `Bearer ${this.token}` };
            const response = await lastValueFrom(this.httpService.post(url, body, { headers }));
            this.logger.log('QR generado exitosamente');
            this.logger.debug('Respuesta BNB: ', response.data);

            if (response.data.success && response.data.qr) {
                return response.data;
            } else {
                this.logger.error('BNB respondió sin éxito:', response.data);
                throw new HttpException(
                    `BNB no generó QR: ${response.data.message || 'Error desconocido'}`,
                    HttpStatus.BAD_GATEWAY
                );
            }
        } catch (error) {
            this.logger.error('Error generando QR');
            
            // Log detallado del error
            if (error.response) {
                this.logger.error(`Status: ${error.response.status}`);
                this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
                
                // Si es error 401, el token no es válido
                if (error.response.status === 401) {
                    this.logger.error('Error 401: Token de BNB no válido o expirado');
                    throw new HttpException(
                        'Error de autenticación con BNB. Verifique las credenciales.',
                        HttpStatus.BAD_GATEWAY
                    );
                }
            } else if (error.request) {
                this.logger.error('No se recibió respuesta de BNB');
                this.logger.error(`Error: ${error.message}`);
            } else {
                this.logger.error(`Error: ${error.message}`);
            }
            
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