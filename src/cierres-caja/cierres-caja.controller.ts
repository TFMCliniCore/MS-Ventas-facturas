import { Controller, Post, Body } from '@nestjs/common';
import { CierresCajaService } from './cierres-caja.service';
import { FinalizarTurnoDto, IniciarTurnoDto } from './dto/crear-cierre.dto';

@Controller('cierres-caja')
export class CierresCajaController {
  constructor(private readonly cierresCajaService: CierresCajaService) {}

  @Post('apertura')
  async abrirCaja(@Body() dto: IniciarTurnoDto) {
    return await this.cierresCajaService.abrirCaja(dto);
  }

  @Post('cierre')
  async cerrarCaja(@Body() dto: FinalizarTurnoDto) {
    return await this.cierresCajaService.procesarCierreTurno(dto);
  }
}