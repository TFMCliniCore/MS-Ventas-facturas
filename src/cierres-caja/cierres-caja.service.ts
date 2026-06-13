import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { IniciarTurnoDto, FinalizarTurnoDto } from './dto/crear-cierre.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CierresCajaService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerDesgloseCajaActiva() {
    const cajaActiva = await this.prisma.cierreCaja.findFirst({
      where: { estado: 'ABIERTA' },
    });

    if (!cajaActiva) {
      return { efectivoVentas: 0, tarjetaVentas: 0 };
    }

    // 1. Sumar los montos de pagos en EFECTIVO
    const sumatoriaEfectivo = await this.prisma.pago.aggregate({
      where: {
        venta: {
          cierreCajaId: cajaActiva.id,
          estado: 'COMPLETADA', 
        },
        metodoPago: {
          nombre: { equals: 'Efectivo', mode: 'insensitive' }
        }
      },
      _sum: { monto: true },
    });

    // 2. Sumar los montos de pagos en TARJETA
    const sumatoriaTarjeta = await this.prisma.pago.aggregate({
      where: {
        venta: {
          cierreCajaId: cajaActiva.id,
          estado: 'COMPLETADA',
        },
        metodoPago: {
          nombre: { equals: 'Tarjeta', mode: 'insensitive' }
        }
      },
      _sum: { monto: true },
    });

    return {
      efectivoVentas: Number(sumatoriaEfectivo._sum.monto || 0),
      tarjetaVentas: Number(sumatoriaTarjeta._sum.monto || 0),
    };
  }

  // 1. BUSCAR CAJA ACTIVA
  async buscarActiva() {
    const activa = await this.prisma.cierreCaja.findFirst({
      where: { estado: 'ABIERTA' },
    });

    if (!activa) return null;

    const desglose = await this.obtenerDesgloseCajaActiva();

    // Calculamos el efectivo esperado de forma explícita para el negocio:
    // Fondo Inicial Físico + Solo ventas en efectivo físico
    const efectivoEsperadoCajon = Number(activa.montoInicial) + desglose.efectivoVentas;

    return {
      ...activa,
      flujoEfectivoVentas: desglose.efectivoVentas, 
      transaccionesDigitales: desglose.tarjetaVentas,
      efectivoTotalEsperado: efectivoEsperadoCajon, // 👈 Enviamos el cálculo directo al frontend
    };
  }

  // 2. LISTAR HISTORIAL DE CIERRES
  async listarHistorial(filtros: { take: number; estado?: 'ABIERTA' | 'CERRADA' }) {
    return this.prisma.cierreCaja.findMany({
      where: filtros.estado ? { estado: filtros.estado } : {},
      take: filtros.take,
      orderBy: { id: 'desc' }, 
    });
  }

  // 3. CREAR APERTURA DE TURNO (POST)
  async crearApertura(dto: IniciarTurnoDto) {
    const existeActiva = await this.buscarActiva();
    if (existeActiva) {
      throw new BadRequestException('Ya existe un turno de caja abierto en el sistema.');
    }

    return this.prisma.cierreCaja.create({
      data: {
        usuarioId: dto.usuarioId,
        sucursalId: dto.sucursalId ?? 1, 
        montoInicial: dto.montoApertura,
        totalCalculado: dto.montoApertura, 
        estado: 'ABIERTA',
        fechaApertura: new Date(),
      },
    });
  }

  // 4. PROCESAR CIERRE Y CUADRE DE CAJA (PATCH)
  async procesarCierre(id: number, dto: FinalizarTurnoDto) {
    const caja = await this.prisma.cierreCaja.findUnique({ where: { id } });
    if (!caja) throw new NotFoundException(`No se encontró el turno con ID #${id}`);
    if (caja.estado === 'CERRADA') throw new BadRequestException('Este turno ya fue cerrado.');

    const desglose = await this.obtenerDesgloseCajaActiva();

    const ef = Number(dto.efectivoReal);
    const tj = Number(dto.tarjetaReal);
    const tf = Number(dto.transferenciaReal);

    const totalRealDeclarado = ef + tj + tf;
    
    // 💡 Concepto de Cuadre: El total esperado en el sistema es la base inicial + todas las ventas del turno
    const totalVentasTurno = desglose.efectivoVentas + desglose.tarjetaVentas;
    const totalCalculadoSistema = Number(caja.montoInicial) + totalVentasTurno;
    const diferenciaFinal = totalRealDeclarado - totalCalculadoSistema;

    return this.prisma.cierreCaja.update({
      where: { id },
      data: {
        efectivoReal: new Prisma.Decimal(ef),
        tarjetaReal: new Prisma.Decimal(tj),
        transferenciaReal: new Prisma.Decimal(tf),
        totalCalculado: new Prisma.Decimal(totalCalculadoSistema), 
        totalReal: new Prisma.Decimal(totalRealDeclarado),
        diferencia: new Prisma.Decimal(diferenciaFinal),
        observaciones: dto.observaciones || null,
        estado: 'CERRADA',
        fechaCierre: new Date(),
      },
    });
  }
}