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
                accountPassword: this.configService.get('BNB_AUTH_ID'),
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
        amount: number,
        gloss: string,
        currency: string = 'BOB',
        expirationDate: string
    ): Promise<any> {
        if (!this.token) {
            await this.authenticate();
        }

        if (currency === 'U') {
            currency = 'USD';
        }

        try {
            const url = `${this.configService.get('BNB_API_URL')}/QRSimple.API/api/v1/main/getQRWithImageAsync`;

            const body = {
                currency,
                gloss,
                amount,
                singleUse: true,
                expirationDate,
                additionalData: JSON.stringify(additionalData),
                destinationAccountId: currency === 'USD' ? 2 : 1,
            }

            this.logger.log('Generando QR con datos: ', body);

            const headers = { Authorization: `Bearer ${this.token}` };
            const response = await lastValueFrom(this.httpService.post(url, body, { headers }));
            this.logger.log('QR generado con datos: ', response.data);

            if (response.data.success && response.data.qr) {
                return response.data;
            } else {
                // Si falla por token expirado (401)
                this.logger.warn('Fallo generando QR, reintentando auth...');
                await this.authenticate();
                const retryResponse = await lastValueFrom(this.httpService.post(url, body, {
                    headers: { Authorization: `Bearer ${this.token}` }
                }));
                return retryResponse.data;
            }
        } catch (error) {
            this.logger.error('Error generando QR', error);
            throw new HttpException('No se pudo generar el QR bancario', HttpStatus.BAD_GATEWAY);
        }
    }
}