import { Controller, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger'; // 👈 Importación de Swagger
import { PagosService } from './pagos.service';
import { CrearPagoDto } from './dto/crear-pago.dto';

@ApiTags('Procesamiento de Pagos')
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post('venta/:ventaId')
  @ApiOperation({ summary: 'Registrar y conciliar múltiples transacciones de pago ligadas a una venta' })
  async registrarPagos(
    @Param('ventaId', ParseIntPipe) ventaId: number,
    @Body('totalAprobado') totalAprobado: number,
    @Body('pagos') pagos: CrearPagoDto[]
  ) {
    return await this.pagosService.procesarPagosVenta(ventaId, totalAprobado, pagos);
  }
}