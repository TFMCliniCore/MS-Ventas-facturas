import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class IniciarTurnoDto {
  @IsNumber()
  @Min(0)
  montoApertura: number;

  @IsNumber()
  usuarioId: number; // 👈 Agregamos esta propiedad para que NestJS no la elimine

  @IsOptional()
  @IsNumber()
  sucursalId?: number; // Por si tu servicio mapea también la sucursal desde el DTO
}

export class FinalizarTurnoDto {
  @IsNumber()
  @Min(0)
  efectivoReal: number;

  @IsNumber()
  @Min(0)
  tarjetaReal: number;

  @IsNumber()
  @Min(0)
  transferenciaReal: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}