import { Controller, Post, Body, Res, HttpStatus, Get, Param, OnModuleInit, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FacturasService } from './facturas.service';
import { join } from 'path';
import * as fs from 'fs';

@ApiTags('Facturación y Comprobantes')
@Controller('facturas')
export class FacturasController implements OnModuleInit {
  private readonly logger = new Logger(FacturasController.name);
  
  // 💡 Permite configurar la ruta por variable de entorno o usar 'facturas_locales' por defecto
  private readonly carpetaFacturas = join(process.cwd(), process.env.FACTURAS_DIR || 'facturas_locales');

  constructor(private readonly facturasService: FacturasService) {}

  // 🚀 Se ejecuta automáticamente cuando NestJS inicia el módulo
  onModuleInit() {
    this.asegurarDirectorioExiste();
  }

  // 🛠️ Verifica y crea la carpeta de forma recursiva si aún no existe en el sistema de archivos
  private asegurarDirectorioExiste() {
    if (!fs.existsSync(this.carpetaFacturas)) {
      fs.mkdirSync(this.carpetaFacturas, { recursive: true });
      this.logger.log(`Directorio de facturas verificado/creado en: ${this.carpetaFacturas}`);
    }
  }

  @Post('generar-manual')
  @ApiOperation({ summary: 'Forzar la generación y guardado manual del PDF de una factura física' })
  async generarFacturaManual(@Body() payload: { venta: any; dtoVenta: any }, @Res() res: Response) {
    try {
      this.asegurarDirectorioExiste();

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
  @ApiOperation({ summary: 'Visualizar, transmitir o descargar un comprobante de pago PDF específico' })
  descargarOVerPdf(@Param('filename') filename: string, @Res() res: Response) {
    this.asegurarDirectorioExiste();
    const pathCompleto = join(this.carpetaFacturas, filename);
    
    // 🔍 LOGS DE DIAGNÓSTICO EN CONSOLA CON EL LOGGER NATIVO
    this.logger.log('=== PETICIÓN DE PDF DETECTADA ===');
    this.logger.log(`Archivo solicitado: ${filename}`);
    this.logger.log(`Buscando en ruta absoluta: ${pathCompleto}`);
    this.logger.log(`¿El archivo existe físicamente?: ${fs.existsSync(pathCompleto)}`);

    // 🌐 CORS DINÁMICO: Toma la URL del frontend desde las variables de entorno o permite '*' por defecto
    const allowedOrigin = process.env.FRONTEND_URL || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
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