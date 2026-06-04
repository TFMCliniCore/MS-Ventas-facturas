import { Injectable, BadRequestException } from '@nestjs/common';
import { CrearPagoDto } from './dto/crear-pago.dto';

@Injectable()
export class PagosService {
  
  async procesarPagosVenta(ventaId: number, totalVenta: number, pagos: CrearPagoDto[]) {
    // 1. Validar que la suma de pagos cubra el total exacto de la venta
    const sumaPagos = pagos.reduce((acc, pago) => acc + pago.monto, 0);
    
    // Usamos un margen de tolerancia mínimo por redondeos de punto flotante
    if (Math.abs(sumaPagos - totalVenta) > 0.01) {
      throw new BadRequestException(
        `Los pagos (${sumaPagos}) no coinciden con el total de la venta (${totalVenta})`
      );
    }

    // 2. Aquí iría el guardado en base de datos (TypeORM / Prisma)
    // const pagosGuardados = await this.pagosRepository.save(
    //   pagos.map(pago => ({ ...pago, ventaId }))
    // );

    return {
      success: true,
      mensaje: 'Pagos procesados y conciliados correctamente',
      totalPagado: sumaPagos,
      detalles: pagos
    };
  }
}