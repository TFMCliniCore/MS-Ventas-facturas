import { IsNumber, IsOptional, IsString, Min, IsNotEmpty } from 'class-validator';

export class CrearPagoDto {
  @IsNumber()
  @IsNotEmpty()
  metodoPagoId: number;

  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  monto: number;

  @IsOptional()
  @IsString()
  referencia?: string;
}