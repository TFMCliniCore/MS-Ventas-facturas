import { IsString, IsNumber, IsEnum, IsDateString, IsOptional, Min, Max } from 'class-validator';

export enum TipoPromocion {
  PORCENTAJE = 'PORCENTAJE',
  MONTO_FIJO = 'MONTO_FIJO',
  VOLUMEN = 'VOLUMEN' // Ej: Lleva 3 y paga 2
}

export class CrearPromocionDto {
  @IsString()
  nombre: string; // Ej: 'Pack Cachorro'

  @IsEnum(TipoPromocion)
  tipo: TipoPromocion;

  @IsNumber()
  @Min(0)
  valorDescuento: number; // Puede ser porcentaje (15.00) o dinero ($10.00)

  @IsOptional()
  @IsNumber()
  categoriaId?: number; // Si aplica a toda una categoría (Ej: Alimentos)

  @IsOptional()
  @IsNumber()
  productoId?: number; // Si aplica a un ítem específico

  @IsOptional()
  @IsNumber()
  cantidadMinima?: number; // Para reglas por volumen (Ej: A partir de 3 unidades)

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;
}