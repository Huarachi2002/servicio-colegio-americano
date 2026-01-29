import { HttpService } from "@nestjs/axios";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { lastValueFrom } from "rxjs";
import { CustomLoggerService } from "src/common/logger";


@Injectable()
export class BgService {
    private readonly logger: CustomLoggerService;
    private token: string = null;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly customLogger: CustomLoggerService,
    ) { 
        this.logger = this.customLogger.setContext(BgService.name);
    }

    async authenticate(): Promise<string> {
        try {
            const url = `${this.configService.get('BG_API_URL')}/ws-servicio-codigo-qr-empresas/service/v1/qrcode/access`;
            // Datos del Encabezado X-Api-Key y Content-Type
            const headers = {
                'X-Api-Key': this.configService.get('BG_API_KEY'),
                'Content-Type': 'application/json',
            };
            // Datos body
            const body = {
                'userName': this.configService.get('BG_API_USER'),
                'password': this.configService.get('BG_API_PASSWORD'),
            };

            this.logger.log(`Autenticando con BG: ${url}`);
            this.logger.debug(`Credenciales: userName=${body.userName}`);

            const response = await lastValueFrom(this.httpService.post(url, body, { headers }));

            this.logger.log('Respuesta de autenticación BG:', JSON.stringify(response.data));

            if (response.data && response.data.token) {
                this.token = response.data.token;
                this.logger.log('Autenticación exitosa con BG');
                return this.token;
            } else {
                this.logger.error('BG rechazó la autenticación:', response.data);
                throw new Error(`Fallo la autenticacion con BG: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            this.logger.error('Error autenticando con BG');
            if (error.response) {
                this.logger.error(`Status: ${error.response.status}`);
                this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
                this.logger.error(`Headers: ${JSON.stringify(error.response.headers)}`);
            } else if (error.request) {
                this.logger.error('No se recibió respuesta del servidor BG');
                this.logger.error(`Error: ${error.message}`);
            }
            else {
                this.logger.error(`Error: ${error.message}`);
            }

            throw new HttpException(
                `Error de comunicación bancaria: ${error.message}`,
                HttpStatus.BAD_GATEWAY
            )
        }
    }

    async generateQR(
        amount: number | string,
        gloss: string,
        currency: string = 'BOB',
        expirationDate: string,
    ): Promise<any> {

        this.logger.log('Generando QR en BG');
        if (!this.token) {
            await this.authenticate();
        }

        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        if (isNaN(numericAmount) || numericAmount <= 0) {
            this.logger.error(`Amount inválido para generación de QR en BG: ${amount}`);
            throw new HttpException(
                'El monto debe ser un número mayor a 0',
                HttpStatus.BAD_REQUEST
            );
        }
        try {
            const url = `${this.configService.get('BG_API_URL')}/ws-servicio-codigo-qr-empresas/service/v1/qrcode/collections`;
            // Datos de cabecera
            const headers = {
                'token': this.token
            }

            const body = {
                'accountReference': this.configService.get('BG_ACCOUNT_ID'),
                'amount': numericAmount,
                'currency': currency,
                'gloss': gloss,
                'expirationDate': expirationDate,
                'sigleUse': 1,
                'userName': this.configService.get('BG_API_USER'),
                'apiKey': this.configService.get('BG_API_KEY'),
            }

            // this.logger.log('Generando QR con datos: ', body);
            this.logger.log(`Generando QR con datos: ${body}`);
            this.logger.log(`URL: ${url}`);
            this.logger.log(`Headers: ${JSON.stringify(headers)}`);

            const response = await lastValueFrom(this.httpService.post(url, body, { headers }));
            this.logger.log('QR generado exitosamente');
            this.logger.debug('Respuesta BNB: ', response.data);

            if (response.data && response.data.qrImage) {
                return response.data;
            } else {
                this.logger.error('BNB respondió sin éxito:', response.data);
                throw new HttpException(
                    `BNB no generó QR: ${response.data.message || 'Error desconocido'}`,
                    HttpStatus.BAD_GATEWAY
                );
            }
        } catch (error) {
            this.logger.error('No se pudo autenticar con BG para generar QR');
            throw error;
        }
    }
}