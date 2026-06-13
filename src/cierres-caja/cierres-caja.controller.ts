import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { CierresCajaService } from './cierres-caja.service';
import { IniciarTurnoDto, FinalizarTurnoDto } from './dto/crear-cierre.dto';

@Controller('cierres-caja')
export class CierresCajaController {
  constructor(private readonly cierresCajaService: CierresCajaService) {}

  @Get('activa')
  async buscarActiva() {
    return await this.cierresCajaService.buscarActiva();
  }

  @Get()
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
  async crearApertura(@Body() dto: IniciarTurnoDto) {
    return await this.cierresCajaService.crearApertura(dto);
  }

  @Patch(':id/cerrar')
  async procesarCierre(
    @Param('id', ParseIntPipe) id: number, // 👈 Convierte el ID de la URL en número de forma nativa
    @Body() dto: FinalizarTurnoDto,
  ) {
    return await this.cierresCajaService.procesarCierre(id, dto);
  }
}