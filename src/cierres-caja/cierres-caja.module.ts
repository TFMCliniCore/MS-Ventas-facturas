import { Module } from '@nestjs/common';
import { CierresCajaController } from './cierres-caja.controller';
import { CierresCajaService } from './cierres-caja.service';

@Module({
  controllers: [CierresCajaController],
  providers: [CierresCajaService],
  exports: [CierresCajaService]
})
export class CierresCajaModule {}