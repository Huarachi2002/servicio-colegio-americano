import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post } from "@nestjs/common";
import { DeviceService } from "../services/device.service";
import { DeviceStoreDto } from "../dto/device-store.dto";
import { ApiResponseMovil } from "src/common/interfaces/api-response-movil.interface";
import { DeviceUpdateDto } from "../dto/device-update.dto";

@Controller()
export class DeviceController {
    constructor(private readonly deviceService: DeviceService) { }

    @Post('device')
    async store(@Body() deviceDto: DeviceStoreDto): Promise<ApiResponseMovil> {

        try {
            const newDevice = await this.deviceService.storeDevice(deviceDto);

            return {
                status: 'success',
                message: 'Device stored successfully',
                data: newDevice
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                'Autentication failed',
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @Post('update_device_token')
    async update(@Body() deviceDto: DeviceUpdateDto): Promise<ApiResponseMovil> {

        try {
            const updatedDevice = await this.deviceService.updateModel(deviceDto);
            if (!updatedDevice) {
                return {
                    status: 'error',
                    message: 'Device not found',
                    data: null
                };
            }

            return {
                status: 'success',
                message: 'Device updated successfully',
                data: updatedDevice
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                'Autentication failed',
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }


}
