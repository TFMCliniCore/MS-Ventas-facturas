import { Injectable, BadRequestException } from '@nestjs/common';
import { FinalizarTurnoDto, IniciarTurnoDto } from './dto/crear-cierre.dto';

@Injectable()
export class CierresCajaService {
  // Mock de estado en memoria (En producción se asocia a una tabla de turnos/cierres en la DB)
  private turnoActivo = {
    id: 1,
    idUsuario: 102,
    montoApertura: 50.00,
    estado: 'ABIERTO',
    fechaApertura: new Date(),
  };

  async abrirCaja(dto: IniciarTurnoDto) {
    if (this.turnoActivo && this.turnoActivo.estado === 'ABIERTO') {
      throw new BadRequestException('Ya existe un turno de caja abierto para este usuario.');
    }
    // Lógica para guardar la apertura en DB...
    return { success: true, mensaje: 'Turno de caja iniciado', apertura: dto.montoApertura };
  }

  async procesarCierreTurno(dto: FinalizarTurnoDto) {
    // 1. Obtener ventas del turno actual agrupadas por método de pago desde la DB
    // MOCK: Simulamos totales recopilados de las ventas del turno actual
    const ventasEfectivoEsperado = 1250.50; 
    const ventasTarjetaEsperado = 600.00;
    const ventasTransferenciaEsperado = 150.00;

    const totalEsperadoCaja = this.turnoActivo.montoApertura + ventasEfectivoEsperado;
    const totalRealEntregado = dto.efectivoReal + dto.tarjetaReal + dto.transferenciaReal;
    const totalEsperadoSistema = totalEsperadoCaja + ventasTarjetaEsperado + ventasTransferenciaEsperado;

    // 2. Calcular diferencias (Descuadres)
    const descuadreEfectivo = dto.efectivoReal - totalEsperadoCaja;
    const descuadreTarjeta = dto.tarjetaReal - ventasTarjetaEsperado;
    const descuadreTransferencia = dto.transferenciaReal - ventasTransferenciaEsperado;
    const descuadreTotal = descuadreEfectivo + descuadreTarjeta + descuadreTransferencia;

    return {
      turnoId: this.turnoActivo.id,
      usuarioId: this.turnoActivo.idUsuario,
      resumenSistema: {
        montoApertura: this.turnoActivo.montoApertura,
        efectivoEsperado: totalEsperadoCaja,
        tarjetaEsperado: ventasTarjetaEsperado,
        transferenciaEsperado: ventasTransferenciaEsperado,
        totalEsperado: totalEsperadoSistema
      },
      declaradoCajero: {
        efectivo: dto.efectivoReal,
        tarjeta: dto.tarjetaReal,
        transferencia: dto.transferenciaReal,
        totalReal: totalRealEntregado
      },
      descuadres: {
        efectivo: descuadreEfectivo,
        tarjeta: descuadreTarjeta,
        transferencia: descuadreTransferencia,
        balanceTotal: descuadreTotal,
        estado: descuadreTotal === 0 ? 'CUADRADO' : descuadreTotal < 0 ? 'FALTANTE' : 'SOBRANTE'
      },
      observaciones: dto.observaciones || 'Sin novedades',
      fechaCierre: new Date()
    };
  }
}