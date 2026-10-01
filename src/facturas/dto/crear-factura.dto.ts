import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DatosClienteDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  identificacion: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}

export class CrearFacturaDto {
  @IsNumber()
  @IsNotEmpty()
  ventaId: number;

  @ValidateNested()
  @Type(() => DatosClienteDto)
  datosCliente: DatosClienteDto;

  // Se asume que los detalles (productos) se obtienen de la DB usando el ventaId,
  // pero también podrías pasarlos en el DTO si la arquitectura lo exige.
}