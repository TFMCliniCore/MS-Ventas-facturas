import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CrearPagoDto {
  @IsNumber()
  metodoPagoId: number; // 1: Efectivo, 2: Tarjeta, etc.

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  referencia?: string; // Número de voucher o transacción
}