import { IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class ActualizarPrecioDto {
  @IsNumber()
  productoId: number;

  @IsNumber()
  costo: number;

  @IsNumber()
  
  porcentajeMargenDeseado: number; 

  @IsNumber()
  usuarioId: number; 

  @IsBoolean()
  @IsOptional()
  permitirMargenNegativo?: boolean; 
}