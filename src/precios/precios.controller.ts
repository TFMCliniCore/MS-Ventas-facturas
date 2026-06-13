import { Controller, Post, Get, Body, Param, ParseIntPipe, Query, DefaultValuePipe } from '@nestjs/common';
import { PreciosService } from './precios.service';
import { ActualizarPrecioDto } from './dto/actualizar-precio.dto';

@Controller('precios')
export class PreciosController {
  constructor(private readonly preciosService: PreciosService) {}

  @Post()
  async aplicarNuevoPrecio(@Body() dto: ActualizarPrecioDto) {
    return await this.preciosService.calcularYRegistrarPrecio(dto);
  }

  // 💡 CORREGIDO AQUÍ: Evita el fallo de validación numérica si 'limite' no se envía explícitamente
  @Get('historial')
  async obtenerHistorialGlobal(
    @Query('limite', new DefaultValuePipe('10'), ParseIntPipe) limite: number
  ) {
    return await this.preciosService.obtenerHistorialGlobal(limite);
  }

  @Get('historial/:productoId')
  async obtenerHistorialPorProducto(@Param('productoId', ParseIntPipe) productoId: number) {
    return await this.preciosService.obtenerHistorialProducto(productoId);
  }
}