import { Module } from '@nestjs/common';
import { SapService } from './sap.service';
import { SapDebtService } from './sap-debt.service';

@Module({
    providers: [SapService, SapDebtService],
    exports: [SapService, SapDebtService],
})
export class SapModule { }
