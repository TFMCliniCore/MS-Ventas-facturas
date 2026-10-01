import { IsString, IsNumber, IsEnum, IsDateString, IsOptional, Min, IsNotEmpty } from 'class-validator';

export enum TipoPromocion {
  PORCENTAJE = 'PORCENTAJE',
  MONTO_FIJO = 'MONTO_FIJO',
  VOLUMEN = 'VOLUMEN',
}

export class CrearPromocionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(TipoPromocion)
  @IsNotEmpty()
  tipo: TipoPromocion;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  valorDescuento: number;

  @IsOptional()
  @IsNumber()
  categoriaId?: number;

  @IsOptional()
  @IsNumber()
  productoId?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidadMinima?: number;

  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsDateString()
  @IsNotEmpty()
  fechaFin: string;
}