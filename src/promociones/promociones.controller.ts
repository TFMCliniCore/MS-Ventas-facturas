import { Controller, Post, Body, Get } from '@nestjs/common'; // 👈 Asegúrate de importar Get aquí
import { PromocionesService, Promocion } from './promociones.service';
import { CrearPromocionDto } from './dto/crear-promocion.dto';

@Controller('promociones')
export class PromocionesController {
  constructor(private readonly promocionesService: PromocionesService) {}

  // 🚀 AGREGA ESTE MÉTODO GET QUE HACE FALTA:
  @Get('vigentes')
  async obtenerVigentes() {
    // Aquí llamas al método correspondiente de tu servicio (ej: obtenerPromocionesVigentes)
    return await this.promocionesService.obtenerPromocionesVigentes(); 
  }

  @Post()
  async crear(@Body() dto: CrearPromocionDto): Promise<{ success: boolean; promocion: Promocion }> {
    return await this.promocionesService.crearPromocion(dto);
  }

  @Post('evaluar-carrito')
  async evaluarCarrito(@Body('items') items: any[]) {
    return await this.promocionesService.evaluarYAplicarDescuentos(items);
  }
}