import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Device } from "src/database/entities/device.entity";
import { Repository } from "typeorm";
import { DeviceStoreDto } from "../dto/device-store.dto";
import { DeviceUpdateDto } from "../dto/device-update.dto";
import { CustomLoggerService } from "src/common/logger";

@Injectable()
export class DeviceService {

    private readonly logger: CustomLoggerService;

    constructor(
        @InjectRepository(Device) private readonly deviceRepository: Repository<Device>,
        private readonly customLogger: CustomLoggerService,
    ) { 
        this.logger = this.customLogger.setContext(DeviceService.name);
    }

    async storeDevice(deviceDto: DeviceStoreDto) {
        this.logger.log("========Guardando dispositivo========");

        const device = await this.deviceRepository.findOneBy({ token: deviceDto.token });

        if (device) {
            this.logger.log("Dispositivo encontrado");
            return await this.updateDeviceToken(device, deviceDto.token_fcm);
        } else {
            this.logger.log("Dispositivo no encontrado");
            return await this.createDevice(deviceDto);
        }
    }

    async createDevice(deviceDto: DeviceStoreDto): Promise<Device> {
        this.logger.log("========Creando dispositivo========");

        const device = this.deviceRepository.create(
            { 
                token: deviceDto.token, 
                tokenFcm: deviceDto.token_fcm,
                entityId: deviceDto.entity_id || null,
                entityType: deviceDto.entity_type || null,
            }
        );

        this.logger.log("========Fin creando dispositivo========");
        return await this.deviceRepository.save(device);
    }

    async updateDeviceToken(device: Device, token_fcm: string): Promise<Device> {
        try {
            this.logger.log("========Actualizando dispositivo========");
            
            if (!device) {
                this.logger.error("Error: Device is null or undefined");
                throw new Error("Device not found");
            }

            await this.deviceRepository.update(device.id, { tokenFcm: token_fcm });

            this.logger.log("========Fin actualizando dispositivo========");
            return await this.deviceRepository.findOneBy({ id: device.id });
        } catch (error) {
            this.logger.error(`Error updating device token: ${error.message}`);
            throw error;
        }
    }

    async updateModelOwnerByToken(entityType: string, entityId: number, deviceToken: string) {
        this.logger.log("========Actualizando dispositivo con owner========");

        const device = await this.deviceRepository.findOneBy({ token: deviceToken });
        if (device) {
            this.logger.log("Dispositivo encontrado");
            await this.updateModelOwner(device, entityType, entityId);
        }
    }

    async updateModelOwner(device: Device, entityType: string, entityId: number) {
        this.logger.log("========Actualizando dispositivo con owner========");

        device.entityType = entityType;
        device.entityId = entityId;
        await this.deviceRepository.save(device);
        this.logger.log("========Fin Actualizando dispositivo con owner========");
    }

    async updateModel(deviceDto: DeviceUpdateDto): Promise<Device> {
        this.logger.log("========Actualizando dispositivo========");

        const device = await this.deviceRepository.findOneBy({ id: deviceDto.id });
        if (!device) {
            this.logger.log("Dispositivo no encontrado");
            return null;
        }

        device.token = deviceDto.token;
        device.tokenFcm = deviceDto.token_fcm;
        await this.deviceRepository.save(device);
        this.logger.log("========Fin Actualizando dispositivo========");
        return device;
    }

    /**
     * Busca un dispositivo por su token
     */
    async findDeviceByToken(token: string): Promise<Device | null> {
        return await this.deviceRepository.findOneBy({ token });
    }

    /**
     * Actualiza el token FCM y los datos de owner del dispositivo
     */
    async updateDeviceOwnerAndToken(
        device: Device,
        tokenFcm: string,
        entityType: string,
        entityId: number
    ): Promise<Device> {
        device.tokenFcm = tokenFcm;
        device.entityType = entityType;
        device.entityId = entityId;
        return await this.deviceRepository.save(device);
    }

    /**
     * Vincula un dispositivo a un usuario móvil actualizando el device_id en mobile_users
     */
    async linkDeviceToUser(userId: number, deviceId: number): Promise<void> {
        this.logger.log(`Vinculando dispositivo ${deviceId} al usuario ${userId}`);
        await this.deviceRepository.manager.query(
            'UPDATE mobile_users SET device_id = ? WHERE id = ?',
            [deviceId, userId]
        );
    }
}