import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ExchangeRate } from '../entities/exchange-rate.entity';

export class ExchangeRateSeeder {

    public async run(dataSource: DataSource): Promise<void> {
        const exchangeRateRepository = dataSource.getRepository(ExchangeRate);

        // Verificar si ya existen exchange rates
        const existingExchange = await exchangeRateRepository.count();
        if (existingExchange > 0) {
            console.log('Ya existen exchange rates en la base de datos. Saltando seeder de exchange rates...');
            return;
        }

        console.log('Creando exchange rates...');

        const exchangeRates: Partial<ExchangeRate> = {
            enabled: true,
            exchangeRate: 6.96, // Valor de ejemplo, ajustar según sea necesario
        };

        // Insertar exchange rates
        const createdExchangeRates = await exchangeRateRepository.save(exchangeRates);

        console.log(`Exchange rates creados exitosamente`);
    }

    public async revert(dataSource: DataSource): Promise<void> {
        const exchangeRateRepository = dataSource.getRepository(ExchangeRate);

        console.log('Revirtiendo seeder de exchange rates...');

        // Eliminar todos los exchange rates
        await exchangeRateRepository.clear();

        console.log('Exchange rates eliminados');
    }
}
