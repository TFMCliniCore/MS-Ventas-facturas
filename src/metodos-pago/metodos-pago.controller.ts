import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger'; // 👈 Importación de Swagger
import { MetodosPagoService } from './metodos-pago.service';
import { CrearMetodoPagoDto } from './dto/crear-metodo-pago.dto';

@ApiTags('Métodos de Pago')
@Controller('metodos-pago')
export class MetodosPagoController {
  constructor(private readonly metodosPagoService: MetodosPagoService) {}

  @Post()
  @ApiOperation({ summary: 'Dar de alta un nuevo método de pago aceptado en el POS' })
  crear(@Body() dto: CrearMetodoPagoDto) {
    return this.metodosPagoService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener la lista de todos los métodos de pago configurados en el sistema' })
  obtenerTodos() {
    return this.metodosPagoService.obtenerTodos();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover o deshabilitar un método de pago por su ID' })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.metodosPagoService.eliminar(id);
  }
}