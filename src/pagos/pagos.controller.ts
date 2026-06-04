import { Controller, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CrearPagoDto } from './dto/crear-pago.dto';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post('venta/:ventaId')
  async registrarPagos(
    @Param('ventaId', ParseIntPipe) ventaId: number,
    @Body('totalAprobado') totalAprobado: number,
    @Body('pagos') pagos: CrearPagoDto[]
  ) {
    return await this.pagosService.procesarPagosVenta(ventaId, totalAprobado, pagos);
  }
}