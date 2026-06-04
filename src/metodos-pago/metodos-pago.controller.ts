import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { MetodosPagoService } from './metodos-pago.service';
import { CrearMetodoPagoDto } from './dto/crear-metodo-pago.dto';

@Controller('metodos-pago')
export class MetodosPagoController {
  constructor(private readonly metodosPagoService: MetodosPagoService) {}

  @Post()
  crear(@Body() dto: CrearMetodoPagoDto) {
    return this.metodosPagoService.crear(dto);
  }

  @Get()
  obtenerTodos() {
    return this.metodosPagoService.obtenerTodos();
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.metodosPagoService.eliminar(id);
  }
}