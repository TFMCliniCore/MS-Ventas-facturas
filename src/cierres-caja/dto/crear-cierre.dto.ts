import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class IniciarTurnoDto {
  @IsNumber()
  @Min(0)
  montoApertura: number;
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