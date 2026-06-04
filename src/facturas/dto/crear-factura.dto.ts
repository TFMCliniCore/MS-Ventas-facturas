import { IsNumber, IsObject } from 'class-validator';

export class CrearFacturaDto {
  @IsNumber()
  ventaId: number;

  @IsObject()
  datosCliente: {
    nombre: string;
    identificacion: string;
    direccion?: string;
  };

  // Se asume que los detalles (productos) se obtienen de la DB usando el ventaId,
  // pero también podrías pasarlos en el DTO si la arquitectura lo exige.
}