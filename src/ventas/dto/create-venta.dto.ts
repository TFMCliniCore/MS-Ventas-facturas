import { IsNotEmpty, IsArray, IsOptional, IsNumber, IsString, ValidateNested, Min, ArrayMinSize, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoComprobante } from '@prisma/client';

class DetalleVentaDto {
  @IsNumber()
  @IsNotEmpty()
  productoId: number;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  cantidad: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  precioUnitario: number;

  @IsOptional()
  @IsNumber()
  promocionId?: number;
}

class PagoVentaDto {
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

// Nueva clase para manejar las preferencias de entrega (Flujo Asíncrono)
class MetodoEntregaDto {
  @IsOptional()
  @IsBoolean()
  imprimir?: boolean;

  @IsOptional()
  @IsBoolean()
  enviarCorreo?: boolean;

  @IsOptional()
  @IsBoolean()
  enviarWhatsapp?: boolean;
}

export class CreateVentaDto {
  @IsOptional()
  @IsNumber()
  clienteId?: number;

  @IsOptional()
  @IsNumber()
  descuento?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => DetalleVentaDto)
  detalles: DetalleVentaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => PagoVentaDto)
  pagos: PagoVentaDto[];

  // --- NUEVOS CAMPOS PARA FACTURACIÓN ---

  @IsEnum(TipoComprobante)
  @IsNotEmpty()
  tipoComprobante: TipoComprobante; // TICKET o FACTURA

  @IsOptional()
  @ValidateNested()
  @Type(() => MetodoEntregaDto)
  metodoEntrega?: MetodoEntregaDto;

  // Si no hay clienteId registrado, pero el cliente da su CC/NIT en caja
  @IsOptional()
  @IsString()
  identificacionCliente?: string; 

  @IsOptional()
  @IsString()
  tipoDocumento?: string; // Ej: 'CC', 'NIT'
}