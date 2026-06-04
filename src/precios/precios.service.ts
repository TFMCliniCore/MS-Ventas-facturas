import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asegúrate de que la ruta coincida con tu proyecto
import { ActualizarPrecioDto } from './dto/actualizar-precio.dto';

@Injectable()
export class PreciosService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularYRegistrarPrecio(dto: ActualizarPrecioDto) {
    const { productoId, costo, porcentajeMargenDeseado, usuarioId, permitirMargenNegativo } = dto;

    // 🛑 1. VALIDACIÓN DE MARGEN (Requerimiento Backend)
    // Si el margen es negativo y no viene con la excepción autorizada explícita, se bloquea.
    if (porcentajeMargenDeseado < 0 && !permitirMargenNegativo) {
      throw new BadRequestException(
        `Operación denegada: No se permite configurar un margen negativo (${porcentajeMargenDeseado}%) sin una excepción autorizada.`
      );
    }

    // Aplicación de la fórmula financiera de tu costo/margen
    const factorMargen = 1 - (porcentajeMargenDeseado / 100);
    const precioVentaSugerido = costo / factorMargen;

    // Doble verificación: si el precio de venta final queda por debajo del costo
    if (precioVentaSugerido < costo && !permitirMargenNegativo) {
      throw new BadRequestException(
        `Operación denegada: El precio de venta calculado ($${precioVentaSugerido.toFixed(2)}) es menor al costo base ($${costo}).`
      );
    }

    // 💾 2. AUDITORÍA / HISTORIAL DE CAMBIOS (Inserción Real en BD)
    // Se mapea directamente contra tu modelo 'HistorialPrecio' de Prisma
    const nuevoRegistroPrecio = await this.prisma.historialPrecio.create({
      data: {
        productoId,
        precioCosto: costo,
        precioVenta: Number(precioVentaSugerido.toFixed(2)),
        margen: porcentajeMargenDeseado,
        usuarioId,
        fechaCambio: new Date(), // 🛡️ Fecha blindada del servidor
      }
    });

    // Aquí mantienes tu lógica para notificar vía TCP/gRPC/Eventos al MS Inventario si fuera necesario
    return {
      success: true,
      mensaje: 'Estrategia de precio calculada e historizada en BD exitosamente',
      data: nuevoRegistroPrecio
    };
  }

  async obtenerHistorialProducto(productoId: number) {
    // Consulta real ordenada por el cambio más reciente
    return await this.prisma.historialPrecio.findMany({
      where: { productoId },
      orderBy: { fechaCambio: 'desc' }
    });
  }
}