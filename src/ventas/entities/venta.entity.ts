export class VentaEntity {
  id: number;
  codigo: string;
  fecha: Date;
  clienteId?: number | null;
  usuarioId: number;
  sucursalId: number;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'ANULADA';
  motivoAnulacion?: string | null;
  cierreCajaId?: number | null;
}