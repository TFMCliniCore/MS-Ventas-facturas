import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { TipoComprobante } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service'; // 👈 Inyectamos PrismaService
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/anular-venta.dto';
import { IUsuarioCcontext } from '../common/interfaces/user-request.interface';
import { FacturasService } from '../facturas/facturas.service'; 

@Injectable()
export class VentasService {
  private readonly logger = new Logger(VentasService.name);
  
  // 🌐 Usamos la variable de entorno con fallback al nombre de servicio en red Docker
  private get inventarioUrl(): string {
    return process.env.MS_INVENTARIO_URL || 'http://ms-inventario-api:3007/api/v1';
  }

  constructor(
    private readonly prisma: PrismaService, // 👈 Inyección de dependencias
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
    } = createVentaDto;
    
    const usuarioIdFinal = usuario.id || 1;

    const cajaAbiertaActual = await this.prisma.cierreCaja.findFirst({
      where: { estado: 'ABIERTA' },
    });

    if (!cajaAbiertaActual) {
      throw new ForbiddenException(
        'No puedes registrar ventas. No tienes un turno de caja abierto en este momento.'
      );
    }

    const pagoEnEfectivo = pagos.find(p => Number(p.metodoPagoId) === 1);

    if (pagoEnEfectivo) {
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

    for (const item of detalles) {
      const producto = await this.prisma.producto.findUnique({
        where: { id: item.productoId }
      });
      
      if (!producto) {
        throw new NotFoundException(`Producto con ID ${item.productoId} no existe en inventario.`);
      }
      
      if (producto.cantidadActual < item.cantidad) {
        throw new BadRequestException(`Stock insuficiente para el producto: ${producto.nombre}. Disponible: ${producto.cantidadActual}`);
      }
    }

    let calculadoSubtotal = 0;
    detalles.forEach(item => {
      calculadoSubtotal += item.cantidad * Number(item.precioUnitario);
    });
    calculadoSubtotal = Math.round(calculadoSubtotal * 100) / 100;

    const impuestoPorcentaje = 0.15;
    const totalDescuento = Math.round(Number(descuento) * 100) / 100;
    const subtotalConDescuento = Math.max(0, calculadoSubtotal - totalDescuento);
    
    const calculadosImpuestos = Math.round((subtotalConDescuento * impuestoPorcentaje) * 100) / 100;
    const calculadoTotal = Math.round((subtotalConDescuento + calculadosImpuestos) * 100) / 100;

    const totalPagado = Math.round(pagos.reduce((acc, p) => acc + Number(p.monto), 0) * 100) / 100;

    if (totalPagado !== calculadoTotal) {
      throw new BadRequestException(
        `Discrepancia en los pagos: El monto recibido ($${totalPagado}) no coincide con el total real de la venta ($${calculadoTotal}).`
      );
    }

    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = String(ahora.getFullYear()).slice(-2);
    const fechaFormateada = `${dia}${mes}${anio}`;

    const prefijo = tipoComprobante === TipoComprobante.FACTURA ? 'FACT' : 'TICK';
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, 'X');
    const codigoVenta = `${prefijo}-${fechaFormateada}-${randomStr}`;

    const nuevaVenta = await this.prisma.$transaction(async (tx) => {
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
              
              if (!metodoId || isNaN(metodoId)) {
                throw new BadRequestException(
                  `El campo 'metodoPagoId' es requerido y debe ser un número válido. Recibido: ${p.metodoPagoId}`
                );
              }

              return {
                monto: Number(p.monto),
                referencia: p.referencia || null,
                metodoPago: {
                  connect: { id: metodoId }
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

    this.ejecutarTareasPosterioresAsync(nuevaVenta, detalles, createVentaDto);

    return nuevaVenta;
  }

  private async ejecutarTareasPosterioresAsync(venta: any, detalles: any[], dto: CreateVentaDto) {
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

    try {
      this.logger.log(`[Async] Iniciando maquetación del archivo PDF para: ${venta.codigo}`);
      await this.facturasService.generarYGuardarPdf(venta, dto);
    } catch (error: any) {
      this.logger.error(`🚨 Fallo en la generación del PDF asíncrono: ${error.message}`);
    }
  }

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
      // 🌐 Utiliza la URL configurable de la variable de entorno
      const respuesta = await fetch(`${this.inventarioUrl}/productos`);
      if (!respuesta.ok) throw new Error('No se pudieron obtener los productos de Inventario');
      
      const productosInventario = await respuesta.json();

      for (const prod of productosInventario) {
        let rutaImagen = prod.imagen || null;

        if (rutaImagen) {
          if (rutaImagen.startsWith('/api/v1/')) {
            rutaImagen = rutaImagen.replace('/api/v1/', '/');
          }
          if (!rutaImagen.startsWith('/')) {
            rutaImagen = '/' + rutaImagen;
          }
        }

        const nombreCategoria = prod.categoria?.nombre || 'General';

        await this.prisma.producto.upsert({
          where: { id: prod.id },
          update: {
            nombre: prod.nombre,
            precioVenta: prod.precioVenta,
            cantidadActual: prod.cantidadActual,
            imagen: rutaImagen, 
            categoria: nombreCategoria,
          },
          create: {
            id: prod.id,
            nombre: prod.nombre,
            precioVenta: prod.precioVenta,
            cantidadActual: prod.cantidadActual,
            imagen: rutaImagen, 
            categoria: nombreCategoria,
          },
        });
      }

      return { 
        success: true, 
        message: `Sincronización exitosa. ${productosInventario.length} productos actualizados.` 
      };
    } catch (error) {
      this.logger.error('Error en sincronizarProductosDesdeInventario:', error);
      throw new BadRequestException('Error al sincronizar el catálogo de productos.');
    }
  }

  async obtenerProductosLocales() {
    const productos = await this.prisma.producto.findMany({
      select: {
        id: true,
        nombre: true,
        precioVenta: true,
        cantidadActual: true,
        imagen: true, 
        categoria: true
      }
    });

    this.logger.log(`🔍 [Prisma Ventas DB] Primer producto: ${JSON.stringify(productos[0])}`);

    return productos;
  }
}