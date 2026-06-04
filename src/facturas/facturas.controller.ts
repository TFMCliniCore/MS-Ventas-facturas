import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { FacturasService } from './facturas.service';

@Controller('facturas')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Post('generar-manual')
  async generarFacturaManual(@Body() payload: { venta: any; dtoVenta: any }, @Res() res: Response) {
    try {
      // Adaptado al nuevo método unificado que creamos
      const urlPdf = await this.facturasService.generarYGuardarPdf(payload.venta, payload.dtoVenta);
      
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'PDF generado y guardado exitosamente mediante trigger manual',
        urlPdf: urlPdf
      });
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al generar la factura física',
        error: error.message
      });
    }
  }
}