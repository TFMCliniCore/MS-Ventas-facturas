import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaClient, TipoComprobante } from '@prisma/client';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/update-venta.dto';
import { IUsuarioCcontext } from '../common/interfaces/user-request.interface';
import { FacturasService } from '../facturas/facturas.service'; 


@Injectable()
export class VentasService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(VentasService.name);
  private readonly inventarioUrl = process.env.MS_INVENTARIO_URL || 'http://localhost:3007/api/v1';

  // 👇 AQUÍ AGREGAMOS EL CONSTRUCTOR PARA INYECTAR EL FACTURAS SERVICE 👇
  constructor(
    private readonly facturasService: FacturasService, 
  ) {}

  async create(createVentaDto: CreateVentaDto, usuario: IUsuarioCcontext) {
    const { detalles, pagos, clienteId, descuento = 0, tipoComprobante } = createVentaDto;

    // 1. Validar Stock previo en el MS Inventario (HTTP-Join) - Síncrono y preventivo
    for (const item of detalles) {
      try {
        const res = await fetch(`${this.inventarioUrl}/productos/${item.productoId}`);
        if (!res.ok) throw new NotFoundException(`Producto con ID ${item.productoId} no existe en inventario.`);
        
        const producto = await res.json();
        if (producto.cantidadActual < item.cantidad) { // <-- Corregido
          throw new BadRequestException(`Stock insuficiente para el producto: ${producto.nombre}. Disponible: ${producto.cantidadActual}`);
        }
      } catch (err: any) {
        throw new BadRequestException(err.message || 'Error de comunicación con el MS Inventario.');
      }
    }

      // 2. Calcular Totales matemáticos con redondeo financiero de 2 decimales
      let calculadoSubtotal = 0;
      detalles.forEach(item => {
        calculadoSubtotal += item.cantidad * Number(item.precioUnitario);
      });
      calculadoSubtotal = Math.round(calculadoSubtotal * 100) / 100;

      const impuestoPorcentaje = 0.15; // IVA 15%
      const totalDescuento = Math.round(Number(descuento) * 100) / 100;
      const subtotalConDescuento = Math.max(0, calculadoSubtotal - totalDescuento);
      
      const calculadosImpuestos = Math.round((subtotalConDescuento * impuestoPorcentaje) * 100) / 100;
      const calculadoTotal = Math.round((subtotalConDescuento + calculadosImpuestos) * 100) / 100;

      // 3. Validar y blindar que los montos de pago cubran exactamente el total real
      const totalPagado = Math.round(pagos.reduce((acc, p) => acc + Number(p.monto), 0) * 100) / 100;

      if (totalPagado !== calculadoTotal) {
        throw new BadRequestException(
          `Discrepancia en los pagos: El monto recibido ($${totalPagado}) no coincide con el total real de la venta ($${calculadoTotal}). Transacción rechazada.`
        );
      }

      // --- PUNTO 1: Algoritmo de Generación de Código Único (Prefijo + Fecha + Sufijo Aleatorio) ---
      const ahora = new Date();
      const dia = String(ahora.getDate()).padStart(2, '0');
      const mes = String(ahora.getMonth() + 1).padStart(2, '0');
      const anio = String(ahora.getFullYear()).slice(-2);
      const fechaFormateada = `${dia}${mes}${anio}`; // Ej: 010626

      const prefijo = tipoComprobante === TipoComprobante.FACTURA ? 'FACT' : 'TICK';
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, 'X');
      const codigoVenta = `${prefijo}-${fechaFormateada}-${randomStr}`;
      const usuarioIdFinal = usuario.id || 1;

      const cajaActiva = await this.prisma.cierreCaja.findFirst({
  where: { 
    usuarioId: usuarioIdFinal, // El ID del cajero que viene en el token
    estado: 'ABIERTA' 
  }
});

// 2. Bloqueo Post-Cierre / Consistencia de Turnos
if (!cajaActiva) {
  throw new ForbiddenException(
    'No puedes registrar ventas. No tienes un turno abierto o tu caja ya fue cerrada.'
  );
}
    // 4. Transacción Atómica Local
      const nuevaVenta = await this.prisma.$transaction(async (tx) => {
        // Crear Registro de la Venta en conjunto con su Factura/Ticket inicializado
        return await tx.venta.create({
          data: {
            codigo: codigoVenta, 
            clienteId: clienteId || 1, 
            sucursalId: 1, // Mantenemos el ID 1 fijo para la simulación local

            cierreCajaId: cajaActiva.id,
            
            // 🏷️ COMPORTAMIENTO DINÁMICO DE TOTALES Y DESCUENTOS:
            subtotal: calculadoSubtotal,
            descuento: totalDescuento,
            impuestos: calculadosImpuestos,
            total: calculadoTotal,
            estado: "COMPLETADA",
            usuarioId: usuarioIdFinal, 

            // 📦 MAPEO REAL DE LOS ARTÍCULOS EN LA BASE DE DATOS:
            detalles: {
              create: detalles.map(item => ({
                productoId: item.productoId,
                cantidad: item.cantidad,
                precioUnitario: Number(item.precioUnitario),
                subtotal: Math.round(item.cantidad * Number(item.precioUnitario) * 100) / 100,
                promocionId: item.promocionId || null // Captura el ID de promoción si viene en el payload
              }))
            },

            // 💳 MAPEO REAL DE LAS FORMAS DE PAGO:
            pagos: {
              create: pagos.map(p => ({
                monto: Number(p.monto),
                referencia: p.referencia || null,
                // En lugar de metodoPagoId: p.metodoPagoId directo, hacemos esto:
                metodoPago: {
                  connectOrCreate: {
                    where: { id: p.metodoPagoId || 1 },
                    create: { id: p.metodoPagoId || 1, nombre: "Efectivo / POS" } // Crea el método 1 si no existe en BD
                  }
                }
              }))
            },

            factura: {
              create: {
                numeroComprobante: codigoVenta,
                tipoComprobante: tipoComprobante
              }
            }
          },
          include: {
            detalles: true,
            pagos: true,
            factura: true
          }
        });
      });

// --- PUNTO 6: Procesamiento asíncrono en paralelo en segundo plano (No bloqueante) ---
    try {
      // ✅ PASAMOS EL OBJETO COMPLETO PRIMERO
      await this.facturasService.generarYGuardarPdf(nuevaVenta, createVentaDto); 
    } catch (error) {
      const mensajeError = error instanceof Error ? error.message : String(error);
      this.logger.warn(`⚠️ Venta ${nuevaVenta.id} guardada, pero falló la generación del PDF: ${mensajeError}`);
    }

    return nuevaVenta;
  }

  

  /**
   * Ejecuta múltiples tareas de forma concurrente y aislada sin bloquear la respuesta HTTP principal.
   */
  private async ejecutarTareasPosterioresAsync(venta: any, detalles: any[], dto: CreateVentaDto) {
    
    // Tarea A: Actualización de Stock en el Microservicio de Inventario
    try {
      for (const item of detalles) {
        const stockRes = await fetch(`${this.inventarioUrl}/movimientos-stock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productoId: item.productoId,
            tipo: 'SALIDA',
            cantidad: item.cantidad,
            motivo: `Venta automática POS - Comprobante ${venta.codigo}`,
            usuarioId: venta.usuarioId,
            sucursalId: venta.sucursalId
          })
        });
        
        if (!stockRes.ok) {
          throw new Error(`No se pudo registrar la salida de stock para el producto ${item.productoId}`);
        }
      }
      this.logger.log(`[Async] Inventario actualizado (SALIDA) con éxito para la venta: ${venta.codigo}`);
    } catch (error: any) {
      this.logger.error(`🚨 Fallo al actualizar inventario: ${error.message}`);
    }

    // Tarea B: Recuperar la venta con todas sus relaciones y generar el PDF físico
    try {
      this.logger.log(`[Async] Iniciando maquetación del archivo PDF para: ${venta.codigo}`);
      
      // Buscamos la venta usando 'venta.id' que sí existe en este contexto
      const ventaCompleta = await this.prisma.venta.findUnique({
        where: { id: venta.id },
        include: {
          detalles: true,
          pagos: true,
          factura: true
        }
      });

      // Llamamos a tu servicio inyectado (corregido a minúscula 'this.facturasService')
      if (ventaCompleta) {
        await this.facturasService.generarYGuardarPdf(ventaCompleta, dto);
      }
    } catch (error: any) {
      this.logger.error(`🚨 Fallo en la generación del PDF asíncrono: ${error.message}`);
    }
  }

  

async evaluarYCalcularDescuento(productoId: number, categoriaId: number, cantidad: number, precioUnitario: number): Promise<number> {
  const ahora = new Date(); // 🛡️ Servidor Central impone la hora real de la transacción

  // 1. Buscamos todas las promociones vigentes que apliquen a este producto o a su categoría entera
  const promocionesVigentes = await this.prisma.promocion.findMany({
    where: {
      activa: true,
      fechaInicio: { lte: ahora }, 
      fechaFin: { gte: ahora },    
      OR: [
        { categoriaId: categoriaId } 
        // Puedes agregar aquí lógica si en el futuro introduces promociones específicas por productoId
      ]
    }
  });

  if (promocionesVigentes.length === 0) return 0;

  let mejorDescuento = 0;

  // 2.MOTOR DE PRIORIDAD: Evaluamos cada regla por separado
  for (const promo of promocionesVigentes) {
    let descuentoActual = 0;

    // Simulación de regla de Volumen 
    // Puedes identificarlo por el nombre o 
    if (promo.nombre.toUpperCase().includes('VOLUMEN') || promo.nombre.toUpperCase().includes('3X2')) {
      if (cantidad >= 3) {
        // En un 3x2, se descuenta el equivalente a un producto por cada 3 unidades
        const unidadesRegaladas = Math.floor(cantidad / 3);
        descuentoActual = unidadesRegaladas * precioUnitario;
      }
    } else {
      // Regla estándar: Descuento regular de Categoría (Porcentaje o Monto Fijo)
      if (promo.tipoDescuento === 'PORCENTAJE') {
        descuentoActual = (precioUnitario * cantidad) * (Number(promo.valorDescuento) / 100);
      } else if (promo.tipoDescuento === 'MONTO_FIJO') {
        descuentoActual = Number(promo.valorDescuento) * cantidad;
      }
    }

    // 🎯 REGLA DE ORO: No se acumulan linealmente. 
    // Se selecciona el descuento que otorgue el MAYOR beneficio al cliente.
    if (descuentoActual > mejorDescuento) {
      mejorDescuento = descuentoActual;
    }
  }

  return mejorDescuento;
}

  async findAll() {
    return this.prisma.venta.findMany({
      include: { detalles: true, pagos: true, factura: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: { detalles: true, pagos: true, factura: true }
    });
    if (!venta) throw new NotFoundException(`Venta con ID ${id} no encontrada.`);
    return venta;
  }

  async anular(id: number, anularVentaDto: AnularVentaDto, usuario: IUsuarioCcontext) {
    const venta = await this.findOne(id);
    if (venta.estado === 'ANULADA') {
      throw new BadRequestException('Esta venta ya se encuentra anulada.');
    }

    const ventaAnulada = await this.prisma.$transaction(async (tx) => {
      return await tx.venta.update({
        where: { id },
        data: {
          estado: 'ANULADA',
          motivoAnulacion: anularVentaDto.motivoAnulacion
        },
        include: { detalles: true }
      });
    });

    // Restauración asíncrona de stock al anular para no congestionar la base de datos
    (async () => {
    for (const detalle of venta.detalles) {
      try {
        const stockRes = await fetch(`${this.inventarioUrl}/movimientos-stock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productoId: detalle.productoId,
            tipo: 'ENTRADA', // <-- Regla de negocio para devolver stock
            cantidad: detalle.cantidad,
            motivo: `Anulación de Venta - Código: ${venta.codigo}`,
            usuarioId: venta.usuarioId,
            sucursalId: venta.sucursalId
          })
        });
        if (!stockRes.ok) this.logger.error(`No se pudo registrar entrada de stock para producto ${detalle.productoId}`);
      } catch (err: any) {
        this.logger.error(`Error de red revirtiendo stock: ${err.message}`);
      }
    }
  })();

    return ventaAnulada;
  }
}