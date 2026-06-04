import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService] // Exportable por si Ventas necesita validar el pago antes de cerrar la transacción
})
export class PagosModule {}