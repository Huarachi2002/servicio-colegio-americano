import { CustomLoggerService } from "src/common/logger";
import { PaymentNotificationRequest } from "../interfaces/connector.interface";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import axios, { AxiosInstance } from 'axios';
import { ResponseDataConnector } from "../interfaces/response.interface";

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

    async paymentNotificationHandler(notificationDto: PaymentNotificationRequest): Promise<ResponseDataConnector> {
        this.logger.logIntegrationProcess('ConnectorService', 'paymentNotificationHandler', 'START', { notificationDto });
        try {
            const response = await this.axiosInstance.post('/Payment/Payments', notificationDto);
            if (response.data.code === 202) {
                this.logger.logIntegrationProcess('ConnectorService', 'paymentNotificationHandler', 'SUCCESS', { code: response.data.code });
                return { code: response.data.code, message: response.data.message, data: response.data };
            } else {
                this.logger.logIntegrationProcess('ConnectorService', 'paymentNotificationHandler', 'ERROR', { 
                    message: 'Unexpected response code', 
                    code: response.data.code 
                });
                return { code: response.data.code || 500, message: response.data.message || 'Unexpected response', data: response.data };
            }
        } catch (error) {
            const errorInfo = {
                message: error?.message || 'Unknown error',
                code: error?.code,
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                responseData: error?.response?.data
            };
            this.logger.logIntegrationProcess('ConnectorService', 'paymentNotificationHandler', 'ERROR', { 
                message: 'Error calling Connector API', 
                error: errorInfo 
            });
            return { 
                code: error?.response?.status || 500, 
                message: error?.message || 'Error calling Connector API', 
                data: null 
            };
        }
    }
}