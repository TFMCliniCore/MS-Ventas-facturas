import { IsNumber, IsOptional, IsString, Min, IsNotEmpty } from 'class-validator';

export class IniciarTurnoDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  montoApertura: number;

  @IsNumber()
  @IsNotEmpty()
  usuarioId: number;

  @IsOptional()
  @IsNumber()
  sucursalId?: number;
}

export class FinalizarTurnoDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  efectivoReal: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  tarjetaReal: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  transferenciaReal: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}