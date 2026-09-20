import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger'; // 👈 Importación de Swagger
import { PromocionesService, Promocion } from './promociones.service';
import { CrearPromocionDto } from './dto/crear-promocion.dto';

@ApiTags('Promociones y Descuentos')
@Controller('promociones')
export class PromocionesController {
  constructor(private readonly promocionesService: PromocionesService) {}

  // 🚀 AGREGA ESTE MÉTODO GET QUE HACE FALTA:
  @Get('vigentes')
  @ApiOperation({ summary: 'Obtener el catálogo de promociones y reglas de descuento activas a la fecha' })
  async obtenerVigentes() {
    return await this.promocionesService.obtenerPromocionesVigentes(); 
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva regla promocional o campaña comercial' })
  async crear(@Body() dto: CrearPromocionDto): Promise<{ success: boolean; promocion: Promocion }> {
    return await this.promocionesService.crearPromocion(dto);
  }

  @Post('evaluar-carrito')
  @ApiOperation({ summary: 'Analizar un listado de ítems y simular los descuentos automatizados correspondientes' })
  async evaluarCarrito(@Body('items') items: any[]) {
    return await this.promocionesService.evaluarYAplicarDescuentos(items);
  }
}