import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Device } from "src/database/entities/device.entity";
import { Repository } from "typeorm";
import { DeviceStoreDto } from "../dto/device-store.dto";
import { DeviceUpdateDto } from "../dto/device-update.dto";

@Injectable()
export class DeviceService {

    private readonly logger = new Logger(DeviceService.name);

    constructor(
        @InjectRepository(Device) private readonly deviceRepository: Repository<Device>,
    ) { }

    async storeDevice(deviceDto: DeviceStoreDto) {
        this.logger.log("========Guardando dispositivo========");

        const device = await this.deviceRepository.findOneBy({ token: deviceDto.token });

        if (device) {
            this.logger.log("Dispositivo encontrado");
            return await this.updateDeviceToken(device, deviceDto.token_fcm);
        } else {
            this.logger.log("Dispositivo no encontrado");
            return await this.createDevice(deviceDto.token, deviceDto.token_fcm);
        }
    }

    async createDevice(token: string, token_fcm: string): Promise<Device> {
        this.logger.log("========Creando dispositivo========");

        const device = this.deviceRepository.create({ token, tokenFcm: token_fcm });

        this.logger.log("========Fin creando dispositivo========");
        return await this.deviceRepository.save(device);
    }

    async updateDeviceToken(device: Device, token_fcm: string): Promise<Device> {
        this.logger.log("========Actualizando dispositivo========");

        await this.deviceRepository.update(device.id, { tokenFcm: token_fcm });

        this.logger.log("========Fin actualizando dispositivo========");
        return await this.deviceRepository.findOneBy({ id: device.id });
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
}