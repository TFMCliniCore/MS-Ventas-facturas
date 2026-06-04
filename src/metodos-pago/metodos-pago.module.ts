import { Module } from '@nestjs/common';
import { MetodosPagoService } from './metodos-pago.service';
import { MetodosPagoController } from './metodos-pago.controller';

@Module({
  controllers: [MetodosPagoController],
  providers: [MetodosPagoService], // 👈 Solo dejamos el servicio
  exports: [MetodosPagoService],
})
export class MetodosPagoModule {}