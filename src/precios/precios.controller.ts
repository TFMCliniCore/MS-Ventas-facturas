import { Controller, Post, Get, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PreciosService } from './precios.service';
import { ActualizarPrecioDto } from './dto/actualizar-precio.dto';

@Controller('precios')
export class PreciosController {
  constructor(private readonly preciosService: PreciosService) {}

  @Post('calcular')
  async calcularNuevoPrecio(@Body() dto: ActualizarPrecioDto) {
    return await this.preciosService.calcularYRegistrarPrecio(dto);
  }

  @Get('historial/:productoId')
  async obtenerHistorial(@Param('productoId', ParseIntPipe) productoId: number) {
    return await this.preciosService.obtenerHistorialProducto(productoId);
  }
}