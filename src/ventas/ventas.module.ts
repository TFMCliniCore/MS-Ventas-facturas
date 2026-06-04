import { Module } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { FacturasService } from '../facturas/facturas.service'; 

@Module({
  controllers: [VentasController],
  providers: [VentasService, FacturasService], 
})
export class VentasModule {}