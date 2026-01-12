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

    private async authenticate(): Promise<string> {
        try {
            const url = `${this.configService.get('BNB_API_URL')}/ClientAuthentication.API/api/v1/auth/token`;
            const body = {
                accountId: this.configService.get('BNB_ACCOUNT_ID'),
                accountPassword: this.configService.get('BNB_AUTH_ID'),
            };

            const response = await lastValueFrom(this.httpService.post(url, body));

            if (response.data.success) {
                this.token = response.data.message;
                return this.token;
            } else {
                throw new Error('Fallo la autenticacion con BNB');
            }
        } catch (error) {
            this.logger.error('Error autenticando con BNB', error);
            throw new HttpException('Error de comunicación bancaria', HttpStatus.BAD_GATEWAY);
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