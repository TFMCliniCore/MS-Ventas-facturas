import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger'; // 👈 Importación de Swagger
import { CierresCajaService } from './cierres-caja.service';
import { IniciarTurnoDto, FinalizarTurnoDto } from './dto/crear-cierre.dto';

@ApiTags('Cierres de Caja y Turnos') // 👈 Agrupador para la UI
@Controller('cierres-caja')
export class CierresCajaController {
  constructor(private readonly cierresCajaService: CierresCajaService) {}

  @Get('activa')
  @ApiOperation({ summary: 'Buscar la caja o turno actualmente abierto y activo' })
  async buscarActiva() {
    return await this.cierresCajaService.buscarActiva();
  }

  @Get()
  @ApiOperation({ summary: 'Listar el historial de cierres de caja con filtros de estado y límite' })
  async listarHistorial(
    @Query('limite') limite: string,
    @Query('estado') estado?: 'ABIERTA' | 'CERRADA',
  ) {
    // 💡 Convertimos el string de la URL a número seguro para el servicio
    const take = limite ? parseInt(limite, 10) : 10;
    
    // 💡 El 'return' es obligatorio para que el Front no reciba un vacío
    return await this.cierresCajaService.listarHistorial({ take, estado });
  }

  @Post()
  @ApiOperation({ summary: 'Registrar la apertura de una caja e iniciar un nuevo turno de trabajo' })
  async crearApertura(@Body() dto: IniciarTurnoDto) {
    return await this.cierresCajaService.crearApertura(dto);
  }

  @Patch(':id/cerrar')
  @ApiOperation({ summary: 'Procesar el cierre definitivo de una caja y finalizar el turno de forma segura' })
  async procesarCierre(
    @Param('id', ParseIntPipe) id: number, // 👈 Convierte el ID de la URL en número de forma nativa
    @Body() dto: FinalizarTurnoDto,
  ) {
    return await this.cierresCajaService.procesarCierre(id, dto);
  }
}