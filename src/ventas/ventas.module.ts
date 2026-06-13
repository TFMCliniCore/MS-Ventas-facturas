import { Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

// 1. Importa el módulo de facturas (ajusta la ruta si es necesario)
import { FacturasModule } from '../facturas/facturas.module'; 

@Module({
  // 2. ¡CONECTA EL MÓDULO AQUÍ!
  imports: [FacturasModule], 
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}