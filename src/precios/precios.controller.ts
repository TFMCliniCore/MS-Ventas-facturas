import { Controller, Post, Get, Body, Param, ParseIntPipe, Query, DefaultValuePipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger'; // 👈 Importación de Swagger
import { PreciosService } from './precios.service';
import { ActualizarPrecioDto } from './dto/actualizar-precio.dto';

@ApiTags('Gestión de Precios')
@Controller('precios')
export class PreciosController {
  constructor(private readonly preciosService: PreciosService) {}

  @Post()
  @ApiOperation({ summary: 'Calcular, registrar y actualizar las listas de precios de un producto' })
  async aplicarNuevoPrecio(@Body() dto: ActualizarPrecioDto) {
    return await this.preciosService.calcularYRegistrarPrecio(dto);
  }

  // 💡 CORREGIDO: Evita el fallo de validación numérica si 'limite' no se envía explícitamente
  @Get('historial')
  @ApiOperation({ summary: 'Consultar el historial global de cambios de precios en todo el catálogo' })
  async obtenerHistorialGlobal(
    @Query('limite', new DefaultValuePipe('10'), ParseIntPipe) limite: number
  ) {
    return await this.preciosService.obtenerHistorialGlobal(limite);
  }

  @Get('historial/:productoId')
  @ApiOperation({ summary: 'Consultar la bitácora y auditoría de variaciones de precio de un producto específico' })
  async obtenerHistorialPorProducto(@Param('productoId', ParseIntPipe) productoId: number) {
    return await this.preciosService.obtenerHistorialProducto(productoId);
  }
}