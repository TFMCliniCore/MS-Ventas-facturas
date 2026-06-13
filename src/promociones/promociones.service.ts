import { Injectable, BadRequestException } from '@nestjs/common';
import { CrearPromocionDto, TipoPromocion } from './dto/crear-promocion.dto';

// 1. Definimos una interfaz que extienda del DTO para agregarle el ID autoincremental
export interface Promocion {
  id: number;
  nombre: string;
  tipo: TipoPromocion;
  valorDescuento: number;
  categoriaId?: number;
  productoId?: number;
  cantidadMinima?: number;
  fechaInicio: string;
  fechaFin: string;
}

@Injectable()
export class PromocionesService {
  private promocionesActivas: Promocion[] = [
    {
      id: 1,
      nombre: 'Pack Cachorro',
      tipo: TipoPromocion.PORCENTAJE,
      valorDescuento: 15,
      categoriaId: 3, 
      cantidadMinima: 1,
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31'
    }
  ];

  async crearPromocion(dto: CrearPromocionDto) {
    if (new Date(dto.fechaInicio) >= new Date(dto.fechaFin)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de finalización.');
    }
    
    const nuevaPromo: Promocion = { 
      id: this.promocionesActivas.length + 1, 
      ...dto 
    };
    
    this.promocionesActivas.push(nuevaPromo);
    return { success: true, promocion: nuevaPromo };
  }

  async evaluarYAplicarDescuentos(itemsCarrito: any[]) {
    let descuentoTotalAcumulado = 0;

    const itemsProcesados = itemsCarrito.map(item => {
      const promoApt = this.promocionesActivas.find(p => 
        (p.productoId === item.productoId || p.categoriaId === item.categoriaId) &&
        item.cantidad >= (p.cantidadMinima || 1)
      );

      let descuentoItem = 0;
      let precioFinal = item.precioUnitario;

      if (promoApt) {
        if (promoApt.tipo === TipoPromocion.PORCENTAJE) {
          descuentoItem = (item.precioUnitario * (promoApt.valorDescuento / 100)) * item.cantidad;
        } else if (promoApt.tipo === TipoPromocion.MONTO_FIJO) {
          descuentoItem = promoApt.valorDescuento * item.cantidad;
        }
        precioFinal = item.precioUnitario - (descuentoItem / item.cantidad);
      }

      descuentoTotalAcumulado += descuentoItem;

      return {
        ...item,
        promocionAplicada: promoApt ? promoApt.nombre : null,
        descuentoGenerado: Number(descuentoItem.toFixed(2)),
        totalItemConDescuento: Number((precioFinal * item.cantidad).toFixed(2))
      };
    });

    return {
      items: itemsProcesados,
      descuentoTotal: Number(descuentoTotalAcumulado.toFixed(2))
    };
  }
  
  async obtenerPromocionesVigentes(): Promise<Promocion[]> {
    const ahora = new Date();

    return this.promocionesActivas.filter(promo => {
      const fechaInicio = new Date(promo.fechaInicio);
      const fechaFin = new Date(promo.fechaFin);
      
      // Valida que la fecha actual esté dentro del rango de la promoción
      return ahora >= fechaInicio && ahora <= fechaFin;
    });
  }
}