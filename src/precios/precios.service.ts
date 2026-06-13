import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPrecioDto } from './dto/actualizar-precio.dto';

@Injectable()
export class PreciosService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularYRegistrarPrecio(dto: ActualizarPrecioDto) {
    const { productoId, costo, porcentajeMargenDeseado, usuarioId, permitirMargenNegativo } = dto;

    // VALIDACIÓN EXTRA: Evitar división por cero
    if (porcentajeMargenDeseado >= 100) {
      throw new BadRequestException('Operación denegada: El margen deseado no puede ser igual o mayor al 100%.');
    }

    // VALIDACIÓN DE MARGEN (Requerimiento Backend)
    if (porcentajeMargenDeseado < 0 && !permitirMargenNegativo) {
      throw new BadRequestException(
        `Operación denegada: No se permite configurar un margen negativo (${porcentajeMargenDeseado}%) sin una excepción autorizada.`
      );
    }

    // Aplicación de la fórmula financiera
    const factorMargen = 1 - (porcentajeMargenDeseado / 100);
    const precioVentaSugerido = costo / factorMargen;

    // Doble verificación: si el precio de venta final queda por debajo del costo
    if (precioVentaSugerido < costo && !permitirMargenNegativo) {
      throw new BadRequestException(
        `Operación denegada: El precio de venta calculado ($${precioVentaSugerido.toFixed(2)}) es menor al costo base ($${costo}).`
      );
    }

    // Convertimos el resultado final a un número con 2 decimales fijos para la consistencia en BD
    const precioFinalConsolidado = Number(precioVentaSugerido.toFixed(2));

    // 💾 2. AUDITORÍA / HISTORIAL DE CAMBIOS (Inserción Real en BD)
    // Nota: Aquí sí se guarda el 'precioCosto' porque tu tabla de historial sí posee este campo de auditoría.
    const nuevoRegistroPrecio = await this.prisma.historialPrecio.create({
      data: {
        productoId,
        precioCosto: costo,
        precioVenta: precioFinalConsolidado,
        margen: porcentajeMargenDeseado,
        usuarioId,
        fechaCambio: new Date(), 
      }
    });
    
    // 💡 3. ACTUALIZACIÓN DEL CATÁLOGO LOCAL (Sincroniza el POS al instante)
    // CORREGIDO: Se elimina el campo 'costo' que no pertenece al modelo Producto de ventas
    await this.prisma.producto.update({
      where: { id: productoId },
      data: { 
        precioVenta: precioFinalConsolidado
      },
    });

    return {
      success: true,
      mensaje: 'Estrategia de precio calculada, historizada y aplicada en catálogo local exitosamente',
      data: nuevoRegistroPrecio
    };
  }

  // 💡 NUEVO MÉTODO: Retorna los últimos cambios globales realizados en el negocio
  async obtenerHistorialGlobal(limite: number) {
    return await this.prisma.historialPrecio.findMany({
      take: limite,
      orderBy: { fechaCambio: 'desc' }
    });
  }

  async obtenerHistorialProducto(productoId: number) {
    return await this.prisma.historialPrecio.findMany({
      where: { productoId },
      orderBy: { fechaCambio: 'desc' }
    });
  }
}