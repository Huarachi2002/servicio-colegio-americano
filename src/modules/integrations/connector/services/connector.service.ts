import { CustomLoggerService } from "src/common/logger";
import { PaymentNotificationRequest } from "../interfaces/connector.interface";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ConnectorService {

    private readonly logger: CustomLoggerService;
    private readonly baseUrl: string;
    private axiosInstance: AxiosInstance;

    constructor(
        private readonly customLogger: CustomLoggerService,
        private readonly configService: ConfigService
    ) {
        this.logger = this.customLogger.setContext(ConnectorService.name);
        this.baseUrl = this.configService.get<string>('CONNECTOR_API_BASE_URL') || '';

        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            }
        })
    }

    async paymentNotificationHandler(notificationDto: PaymentNotificationRequest): Promise<void> {
        this.logger.logIntegrationProcess('ConnectorService', 'paymentNotificationHandler', 'START', {notificationDto});
        try {
            const response = await this.axiosInstance.post('/payment-notifications', notificationDto);
            if (response.data.code === 202) {
                return;
            }else {
                this.logger.logIntegrationProcess('ConnectorService', 'paymentNotificationHandler', 'ERROR', {message: 'Unexpected response code', code: response.data.code, data: response.data});
            }
        } catch (error) {
            this.logger.logIntegrationProcess('ConnectorService', 'paymentNotificationHandler', 'ERROR', {message: 'Error calling Connector API', error});
            return;
        }
    }
}