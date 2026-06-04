import { Controller, Post, Body } from '@nestjs/common';
import { PromocionesService, Promocion } from './promociones.service'; // <-- Importa Promocion aquí
import { CrearPromocionDto } from './dto/crear-promocion.dto';

@Controller('promociones')
export class PromocionesController {
  constructor(private readonly promocionesService: PromocionesService) {}

  @Post()
  async crear(@Body() dto: CrearPromocionDto): Promise<{ success: boolean; promocion: Promocion }> {
    return await this.promocionesService.crearPromocion(dto);
  }

  @Post('evaluar-carrito')
  async evaluarCarrito(@Body('items') items: any[]) {
    return await this.promocionesService.evaluarYAplicarDescuentos(items);
  }
}