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
  private readonly inventarioUrl = process.env.MS_INVENTARIO_URL || 'http://host.docker.internal:3007/api/v1';

  constructor(
    private readonly facturasService: FacturasService, 
  ) {}

async create(createVentaDto: CreateVentaDto, usuario: IUsuarioCcontext) {
    const { 
      detalles, 
      pagos, 
      clienteId, 
      descuento = 0, 
      tipoComprobante,
      total,
      montoPagadoCon,
      metodoPagoId 
    } = createVentaDto;
    
    const usuarioIdFinal = usuario.id || 1;

    // 1. Buscamos de forma proactiva la caja activa
    const cajaAbiertaActual = await this.prisma.cierreCaja.findFirst({
      where: { estado: 'ABIERTA' },
    });

    if (!cajaAbiertaActual) {
      throw new ForbiddenException(
        'No puedes registrar ventas. No tienes un turno de caja abierto en este momento.'
      );
    }

    // =========================================================================
    // PASO 1.5: VALIDACIÓN DE FONDOS DISPONIBLES PARA EL VUELTO
    // =========================================================================
    // Suponiendo que metodoPagoId === 1 mapea a 'EFECTIVO'
const pagoEnEfectivo = pagos.find(p => Number(p.metodoPagoId) === 1);

if (pagoEnEfectivo) {
  // En pagos mixtos o exactos, evaluamos la diferencia directa del flujo de efectivo totalizador
  const vueltoRequerido = Number(montoPagadoCon) - Number(total);

  if (vueltoRequerido > 0) {
    const efectivoDisponibleEnCaja = Number(cajaAbiertaActual.montoInicial) || 0;

    if (efectivoDisponibleEnCaja < vueltoRequerido) {
      throw new BadRequestException(
        `Falta de efectivo en caja chica. Disponible: ${efectivoDisponibleEnCaja}, Requerido: ${vueltoRequerido}`
      );
    }
  }
}

    // 2. Validar Stock y Existencia directamente en nuestra tabla local 'Producto'
    for (const item of detalles) {
      try {
        const producto = await this.prisma.producto.findUnique({
          where: { id: item.productoId }
        });
        
        if (!producto) {
          throw new NotFoundException(`Producto con ID ${item.productoId} no existe en inventario.`);
        }
        
        if (producto.cantidadActual < item.cantidad) {
          throw new BadRequestException(`Stock insuficiente para el producto: ${producto.nombre}. Disponible: ${producto.cantidadActual}`);
        }
      } catch (err: any) {
        throw new BadRequestException(err.message || 'Error validando el producto localmente.');
      }
    }

    // 3. Calcular Totales matemáticos con redondeo financiero
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

    // 4. Validar pagos
    const totalPagado = Math.round(pagos.reduce((acc, p) => acc + Number(p.monto), 0) * 100) / 100;

    if (totalPagado !== calculadoTotal) {
      throw new BadRequestException(
        `Discrepancia en los pagos: El monto recibido ($${totalPagado}) no coincide con el total real de la venta ($${calculadoTotal}).`
      );
    }

    // 5. Generación de Códigos
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = String(ahora.getFullYear()).slice(-2);
    const fechaFormateada = `${dia}${mes}${anio}`;

    const prefijo = tipoComprobante === TipoComprobante.FACTURA ? 'FACT' : 'TICK';
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, 'X');
    const codigoVenta = `${prefijo}-${fechaFormateada}-${randomStr}`;

    // 6. PERSISTENCIA EN BD Y ACTUALIZACIÓN DE STOCK LOCAL MEDIANTE TRANSACCIÓN
    const nuevaVenta = await this.prisma.$transaction(async (tx) => {
      
      // 💡 NUEVO: Descontar el stock localmente en cascada
      for (const item of detalles) {
        await tx.producto.update({
          where: { id: item.productoId },
          data: { cantidadActual: { decrement: item.cantidad } }
        });
      }

      return await tx.venta.create({
        data: {
          codigo: codigoVenta, 
          clienteId: clienteId || 1, 
          sucursalId: 1, 
          cierreCajaId: cajaAbiertaActual.id,
          subtotal: calculadoSubtotal,
          descuento: totalDescuento,
          impuestos: calculadosImpuestos,
          total: calculadoTotal,
          estado: "COMPLETADA",
          usuarioId: usuarioIdFinal, 
          detalles: {
            create: detalles.map(item => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnitario: Number(item.precioUnitario),
              subtotal: Math.round(item.cantidad * Number(item.precioUnitario) * 100) / 100,
              promocionId: item.promocionId || null
            }))
          },
          pagos: {
            create: pagos.map(p => {
              const metodoId = Number(p.metodoPagoId);
              
              // 🔥 VALIDACIÓN: Si no viene el ID o no es un número válido, frena la operación
              if (!metodoId || isNaN(metodoId)) {
                throw new BadRequestException(
                  `El campo 'metodoPagoId' es requerido y debe ser un número válido. Recibido: ${p.metodoPagoId}`
                );
              }

              return {
                monto: Number(p.monto),
                referencia: p.referencia || null,
                metodoPago: {
                  connect: { id: metodoId } // 👈 Ya no usamos el "|| 1" a ciegas
                }
              };
            })
          },
          factura: {
            create: {
              numeroComprobante: codigoVenta,
              tipoComprobante: tipoComprobante
            }
          }
        },
        include: { detalles: true, pagos: true, factura: true }
      });
    });

    // 7. Lanzar procesos asíncronos (Descontar stock maestro y generar PDF)
    this.ejecutarTareasPosterioresAsync(nuevaVenta, detalles, createVentaDto);

    return nuevaVenta;
  }

  private async ejecutarTareasPosterioresAsync(venta: any, detalles: any[], dto: CreateVentaDto) {
    // Tarea A: Actualización de Stock en el Microservicio de Inventario (SALIDA)
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

    // Tarea B: Generar el PDF físico de la Factura
    try {
      this.logger.log(`[Async] Iniciando maquetación del archivo PDF para: ${venta.codigo}`);
      await this.facturasService.generarYGuardarPdf(venta, dto);
    } catch (error: any) {
      this.logger.error(`🚨 Fallo en la generación del PDF asíncrono: ${error.message}`);
    }
  }

  // ... (El método evaluarYCalcularDescuento, findAll y findOne se mantienen exactamente iguales)
  async evaluarYCalcularDescuento(productoId: number, categoriaId: number, cantidad: number, precioUnitario: number): Promise<number> {
    const ahora = new Date(); 
    const promocionesVigentes = await this.prisma.promocion.findMany({
      where: {
        activa: true,
        fechaInicio: { lte: ahora }, 
        fechaFin: { gte: ahora },    
        OR: [
          { categoriaId: categoriaId } 
        ]
      }
    });

    if (promocionesVigentes.length === 0) return 0;
    let mejorDescuento = 0;

    for (const promo of promocionesVigentes) {
      let descuentoActual = 0;
      if (promo.nombre.toUpperCase().includes('VOLUMEN') || promo.nombre.toUpperCase().includes('3X2')) {
        if (cantidad >= 3) {
          const unidadesRegaladas = Math.floor(cantidad / 3);
          descuentoActual = unidadesRegaladas * precioUnitario;
        }
      } else {
        if (promo.tipoDescuento === 'PORCENTAJE') {
          descuentoActual = (precioUnitario * cantidad) * (Number(promo.valorDescuento) / 100);
        } else if (promo.tipoDescuento === 'MONTO_FIJO') {
          descuentoActual = Number(promo.valorDescuento) * cantidad;
        }
      }
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
      
      // 💡 NUEVO: Restaurar el stock localmente devolviendo los productos
      for (const detalle of venta.detalles) {
        await tx.producto.update({
          where: { id: detalle.productoId },
          data: { cantidadActual: { increment: detalle.cantidad } }
        });
      }

      return await tx.venta.update({
        where: { id },
        data: {
          estado: 'ANULADA',
          motivoAnulacion: anularVentaDto.motivoAnulacion
        },
        include: { detalles: true }
      });
    });

    // Restauración asíncrona de stock maestro en ms_inventario (ENTRADA)
    (async () => {
      for (const detalle of venta.detalles) {
        try {
          const stockRes = await fetch(`${this.inventarioUrl}/movimientos-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productoId: detalle.productoId,
              tipo: 'ENTRADA', 
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

  async sincronizarProductosDesdeInventario() {
    try {
      const respuesta = await fetch('http://ms-inventario-api:3007/api/v1/productos');
      if (!respuesta.ok) throw new Error('No se pudieron obtener los productos de Inventario');
      
      const productosInventario = await respuesta.json();

      for (const p of productosInventario) {
        await this.prisma.producto.upsert({
          where: { id: Number(p.id) },
          update: {
            nombre: p.nombre,
            precioVenta: Number(p.precioVenta),
            cantidadActual: p.cantidadActual,
          },
          create: {
            id: Number(p.id),
            nombre: p.nombre,
            precioVenta: Number(p.precioVenta),
            cantidadActual: p.cantidadActual,
          },
        });
      }

      return { 
        success: true, 
        message: `Sincronización exitosa. ${productosInventario.length} productos actualizados.` 
      };
    } catch (error) {
      console.error('Error en sincronizarProductosDesdeInventario:', error);
      throw new BadRequestException('Error al sincronizar el catálogo de productos.');
    }
  }

  async obtenerProductosLocales() {
    return await this.prisma.producto.findMany({});
  }
}