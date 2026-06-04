import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CrearMetodoPagoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsBoolean()
  @IsOptional()
  requiereReferencia?: boolean;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}