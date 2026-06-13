import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { FacturasService } from './facturas.service';
import { Get, Param, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';


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
  @Get(':filename')
  descargarOVerPdf(@Param('filename') filename: string, @Res() res: Response) {
    const pathCompleto = join(process.cwd(), 'facturas_locales', filename);
    
    // 🔍 LOGS DE DIAGNÓSTICO EN CONSOLA
    console.log('=== PETICIÓN DE PDF DETECTADA ===');
    console.log('Archivo solicitado:', filename);
    console.log('Buscando en ruta absoluta:', pathCompleto);
    console.log('¿El archivo existe físicamente?:', fs.existsSync(pathCompleto));

    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    if (!fs.existsSync(pathCompleto)) {
      return res.status(HttpStatus.NOT_FOUND).json({
        statusCode: 404,
        message: `El comprobante o ticket '${filename}' no existe en el servidor. Ruta: ${pathCompleto}`,
        error: 'Not Found'
      });
    }

    return res.sendFile(pathCompleto);
  }
}