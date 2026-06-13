import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, TipoComprobante } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');

@Injectable()
export class FacturasService {
  private prisma = new PrismaClient();
  private readonly logger = new Logger(FacturasService.name);
  
  private readonly carpetaAlmacenamiento = path.join(process.cwd(), 'facturas_locales');

  constructor() {
    this.asegurarCarpetaAlmacenamiento();
  }

  private asegurarCarpetaAlmacenamiento() {
    if (!fs.existsSync(this.carpetaAlmacenamiento)) {
      fs.mkdirSync(this.carpetaAlmacenamiento, { recursive: true });
      this.logger.log(`📁 Carpeta asegurada en: ${this.carpetaAlmacenamiento}`);
    }
  }

  // Búsqueda dinámica del logo para sortear problemas de directorios en Docker/Monorepos
  private obtenerRutaLogo(): string | null {
    const rutasPosibles = [
      // 1. Si estás parado en la raíz del monorepo
      path.join(process.cwd(), 'MS-Ventas', 'assets', 'clinicore-logo.png'),
      
      // 2. Si estás parado directamente dentro de la carpeta MS-Ventas
      path.join(process.cwd(), 'assets', 'clinicore-logo.png'),
      
      // 3. Ruta relativa al archivo actual usando __dirname (Suele rescatarte en producción/Docker)
      path.join(__dirname, '..', '..', 'assets', 'clinicore-logo.png'),
      path.join(__dirname, '..', 'assets', 'clinicore-logo.png'),
      path.join(__dirname, 'assets', 'clinicore-logo.png')
    ];

    for (const ruta of rutasPosibles) {
      if (fs.existsSync(ruta)) {
        this.logger.log(`✅ Logo de CliniCore encontrado en: ${ruta}`);
        return ruta;
      }
    }

    this.logger.warn(`⚠️ No se pudo encontrar el logo en ninguna de las rutas mapeadas.`);
    return null;
  }

  async generarYGuardarPdf(venta: any, dtoVenta: any): Promise<string> {
    this.asegurarCarpetaAlmacenamiento();

    const { codigo, total, subtotal, impuestos, descuento, detalles, pagos, factura } = venta;
    const listaDetalles = detalles || []; 
    const listaPagos = pagos || []; 
    
    // VALIDACIÓN ROBUSTA: Si no viene en factura, revisa la venta o el DTO.
    const tipoStr = factura?.tipoComprobante || dtoVenta?.tipoComprobante || venta?.tipoComprobante || 'FACTURA';
    // Si la cadena incluye 'TICKET', asume ticket, de lo contrario (ej. 'FACTURA') fuerza el A4.
    const isTicket = tipoStr.toUpperCase() === 'TICKET'; 
    const tipo = tipoStr.toUpperCase();

    const fechaVenta = venta.fecha ? new Date(venta.fecha) : new Date();
    const nombreArchivo = `${codigo || 'SIN-CODIGO'}.pdf`;
    const rutaCompleta = path.join(this.carpetaAlmacenamiento, nombreArchivo);
      
    return new Promise((resolve, reject) => {
      try {
        this.logger.log(`⏳ Generando comprobante: ${nombreArchivo} | Formato detectado: ${isTicket ? 'TICKET' : 'A4'}`);
        
        const doc = new PDFDocument({
          size: isTicket ? [226, 650] : 'A4',
          margin: isTicket ? 12 : 40,
        });

        const writeStream = fs.createWriteStream(rutaCompleta);
        doc.pipe(writeStream);

        // --- PALETA ORIGINAL RESTAURADA ---
        const colorPrimario = '#00529B';   // Azul Corporativo CliniCore
        const colorSecundario = '#2E7D32'; // Verde Clínico
        const colorTexto = '#2C3E50';      // Gris Oscuro 
        const colorGrisClaro = '#F4F6F9';  // Fondo de tablas A4
        const colorLineas = '#E2E8F0';     // Divisores

        // ==========================================
        // OBTENCIÓN DEL LOGO
        // ==========================================
        const rutaLogoValida = this.obtenerRutaLogo();

        // ==========================================
        // 1. ENCABEZADO Y LOGO
        // ==========================================
        if (!isTicket) {
          // --- DISEÑO A4 ---
          // 1. Primero pintamos el Logo o el círculo de fallback
          if (!isTicket) {
          // --- DISEÑO A4 ---
          // 1. Primero pintamos el Logo o el círculo de fallback de forma única
          if (rutaLogoValida) {
            doc.image(rutaLogoValida, 40, 28, { width: 85 });
          } else {
            doc.fillColor(colorPrimario).circle(77, 60, 32).fill();
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(28).text('+', 62, 42, { width: 30, align: 'center' });
          }

          // 2. Título y subtítulo de la empresa
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(22).text('CLINICORE S.A.S.', 130, 42);
          doc.fillColor(colorSecundario).font('Helvetica-Oblique').fontSize(9.5).text('Sistemas de Gestión de Salud', 130, 66);
          
          // Recuadro del comprobante (Factura)
          doc.fillColor(colorGrisClaro).rect(380, 35, 175, 55).fill();
          doc.strokeColor(colorPrimario).lineWidth(1).rect(380, 35, 175, 55).stroke();
          
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(11).text(tipo, 390, 42, { width: 155, align: 'center' });
          doc.fillColor('#E74C3C').fontSize(11).text(codigo || '', 390, 56, { width: 155, align: 'center' });
          doc.fillColor(colorTexto).font('Helvetica').fontSize(8).text(`Emisión: ${fechaVenta.toLocaleString('es-CO')}`, 390, 74, { width: 155, align: 'center' });
          doc.moveDown(2.5);

        } else {
          // --- DISEÑO TICKET ---
          // 1. Primero el Logo centrado o su respectivo fallback
          if (rutaLogoValida) {
            doc.image(rutaLogoValida, 88, 15, { width: 50 });
            doc.moveDown(4);
          } else {
            doc.fillColor(colorSecundario).circle(113, 28, 12).fill();
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15).text('+', 103, 20, { width: 20, align: 'center' });
            doc.moveDown(2);
          }

          // 2. Título comercial abajo del logo/icono
          doc.font('Helvetica-Bold')
            .fontSize(12)
            .fillColor(colorTexto)
            .text('CLINICORE S.A.S.', { align: 'center' });
          
          doc.moveDown(0.5);
        }

          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(12).text('CLINICORE S.A.S.', { align: 'center' });
          doc.fillColor(colorTexto).font('Helvetica').fontSize(8).text('Sistemas de Gestión de Salud', { align: 'center' });
          doc.text(`Sucursal ID: ${venta.sucursalId || 1} | Cajero ID: ${venta.usuarioId || 1}`, { align: 'center' });
          doc.moveDown(0.5);
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(9).text(`${tipo}: ${codigo}`, { align: 'center' });
          doc.fillColor(colorTexto).font('Helvetica').fontSize(8).text(`Fecha: ${fechaVenta.toLocaleString('es-CO')}`, { align: 'center' });
          doc.moveDown(0.5);
        }

        // ==========================================
        // 2. DATOS DEL CLIENTE
        // ==========================================
        const separarSeccion = () => {
          if (isTicket) {
            doc.strokeColor(colorLineas).lineWidth(1).moveTo(12, doc.y).lineTo(214, doc.y).stroke();
            doc.moveDown(0.3);
          } else {
            doc.strokeColor(colorPrimario).lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
            doc.moveDown(0.5);
          }
        };

        separarSeccion();
        doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(isTicket ? 8 : 11).text('DATOS DEL CLIENTE');
        doc.fillColor(colorTexto).font('Helvetica').fontSize(isTicket ? 8 : 10);
        
        if (dtoVenta && dtoVenta.identificacionCliente) {
          doc.text(`Cliente / Paciente: ${dtoVenta.nombreCliente || 'Particular'}`);
          doc.text(`Documento: (${dtoVenta.tipoDocumento || 'CC'}) ${dtoVenta.identificacionCliente}`);
        } else if (venta.clienteId && venta.clienteId !== 1) {
          doc.text(`ID Cliente Core: ${venta.clienteId}`);
        } else {
          doc.text('Cliente: Consumidor Final');
        }
        
        if (!isTicket) doc.text(`Sucursal Origen: Módulo Principal (ID ${venta.sucursalId || 1})`);
        separarSeccion();
        doc.moveDown(0.5);

        // ==========================================
        // 3. TABLA DE PRODUCTOS
        // ==========================================
        if (!isTicket) {
          // --- TABLA FORMAL A4 ---
          let yTabla = doc.y;
          
          doc.fillColor(colorPrimario).rect(40, yTabla, 515, 22).fill();
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
          
          doc.text('DESCRIPCIÓN DEL ARTÍCULO / PRODUCTO', 50, yTabla + 6, { width: 230 });
          doc.text('CANT.', 290, yTabla + 6, { width: 50, align: 'center' });
          doc.text('P. UNITARIO', 350, yTabla + 6, { width: 90, align: 'right' });
          doc.text('TOTAL NETO', 450, yTabla + 6, { width: 95, align: 'right' });
          
          yTabla += 22;
          doc.font('Helvetica').fontSize(9).fillColor(colorTexto);

          listaDetalles.forEach((det: any, index: number) => {
            if (index % 2 === 1) doc.fillColor(colorGrisClaro).rect(40, yTabla, 515, 20).fill();
            doc.fillColor(colorTexto);

            const nombreArticulo = det.producto?.nombre || `Producto Código ID: ${det.productoId ?? 'N/A'}`;
            const cant = det.cantidad ?? 0;
            const precio = Number(det.precioUnitario) || 0;
            const subtotalDet = Number(det.subtotal) || 0;

            doc.text(nombreArticulo, 50, yTabla + 5, { width: 230, height: 10, ellipsis: true });
            doc.text(`${cant}`, 290, yTabla + 5, { width: 50, align: 'center' });
            doc.text(`$${precio.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, 350, yTabla + 5, { width: 90, align: 'right' });
            doc.text(`$${subtotalDet.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, 450, yTabla + 5, { width: 95, align: 'right' });

            doc.strokeColor(colorLineas).lineWidth(0.5).moveTo(40, yTabla + 20).lineTo(555, yTabla + 20).stroke();
            yTabla += 20;
          });

          doc.y = yTabla + 10;
        } else {        
          // --- TABLA TICKET ---
          let yTabla = doc.y;
          doc.fillColor(colorGrisClaro).rect(12, yTabla, 202, 14).fill();
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(7.5);
          
          doc.text('ARTÍCULO', 16, yTabla + 3, { width: 85 });
          doc.text('CANT', 105, yTabla + 3, { width: 22, align: 'center' });
          doc.text('P.UNIT', 130, yTabla + 3, { width: 35, align: 'right' });
          doc.text('TOTAL', 170, yTabla + 3, { width: 40, align: 'right' });
          
          yTabla += 15;
          doc.font('Helvetica').fontSize(7).fillColor(colorTexto);
          
          listaDetalles.forEach((det: any) => {
            const nombreArticulo = det.producto?.nombre || `Articulo ID: ${det.productoId}`;
            const cant = `${det.cantidad}`;
            const precio = `$${Number(det.precioUnitario).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
            const totalDet = `$${Number(det.subtotal).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
            
            doc.text(nombreArticulo, 16, yTabla, { width: 85, height: 9, ellipsis: true });
            doc.text(cant, 105, yTabla, { width: 22, align: 'center' });
            doc.text(precio, 130, yTabla, { width: 35, align: 'right' });
            doc.text(totalDet, 170, yTabla, { width: 40, align: 'right' });
            yTabla += 12;
          });
          
          doc.y = yTabla + 5;
        }

        // ==========================================
        // 4. SECCIÓN DE TOTALES Y PAGOS
        // ==========================================
        if (!isTicket) {
          const yTotalesBase = doc.y;
          
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(10).text('FORMAS DE PAGO:', 40, yTotalesBase);
          doc.font('Helvetica').fontSize(9).fillColor(colorTexto);
          let yPagos = yTotalesBase + 15;
          
          listaPagos.forEach((p: any) => {
            doc.text(`• Método [ID ${p.metodoPagoId}]: $${Number(p.monto).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, 40, yPagos);
            if (p.referencia) {
              yPagos += 12;
              doc.fillColor(colorSecundario).font('Helvetica-Oblique').fontSize(8).text(`   Ref: ${p.referencia}`, 40, yPagos).font('Helvetica').fontSize(9);
            }
            yPagos += 15;
          });

          const xBloqueTotales = 360;
          let yTotales = yTotalesBase;
          
          const alinearTotal = (etiqueta: string, valor: number, esNegrita = false, esDescuento = false) => {
            doc.fillColor(esNegrita ? colorPrimario : colorTexto).font(esNegrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(esNegrita ? 11 : 9);
            doc.text(etiqueta, xBloqueTotales, yTotales, { width: 100 });
            const prefijo = esDescuento ? '-$' : '$';
            doc.text(`${prefijo}${Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, xBloqueTotales + 100, yTotales, { width: 95, align: 'right' });
            yTotales += 18;
          };

          alinearTotal('Subtotal:', subtotal || 0);
          if (Number(descuento) > 0) alinearTotal('Descuento:', descuento, false, true);
          alinearTotal('IVA (15%):', impuestos || 0);
          
          doc.strokeColor(colorPrimario).lineWidth(1).moveTo(xBloqueTotales, yTotales).lineTo(555, yTotales).stroke();
          yTotales += 5;
          alinearTotal('TOTAL A PAGAR:', total || 0, true);
          
          doc.y = Math.max(yPagos, yTotales) + 20;
        } else {
          let yTotales = doc.y;
          const alinearTotalTicket = (label: string, valor: number, esNegrita = false, esDescuento = false) => {
            doc.fillColor(esNegrita ? colorPrimario : colorTexto).font(esNegrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(esNegrita ? 8.5 : 7.5);
            doc.text(label, 95, yTotales, { width: 55, align: 'left' });
            const prefijo = esDescuento ? '-$' : '$';
            doc.text(`${prefijo}${Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`, 150, yTotales, { width: 60, align: 'right' });
            yTotales += esNegrita ? 14 : 11;
          };

          alinearTotalTicket('Subtotal:', subtotal || 0);
          if (Number(descuento) > 0) alinearTotalTicket('Descuento:', descuento, false, true);
          alinearTotalTicket('IVA (15%):', impuestos || 0);
          
          doc.strokeColor(colorLineas).lineWidth(0.5).moveTo(95, yTotales + 2).lineTo(210, yTotales + 2).stroke();
          yTotales += 5;
          
          alinearTotalTicket('TOTAL:', total || 0, true);
          doc.y = yTotales + 10;
          
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(8).text('FORMAS DE PAGO:', 12, doc.y);
          doc.font('Helvetica').fontSize(7.5).fillColor(colorTexto);
          listaPagos.forEach((p: any) => {
            doc.text(`• Recibido: $${Number(p.monto).toLocaleString('es-CO', { maximumFractionDigits: 0 })} ${p.referencia ? `(${p.referencia})` : ''}`, 12, doc.y);
          });
          doc.moveDown(1.5);
        }

        // ==========================================
        // 5. PIE DE PÁGINA
        // ==========================================
        doc.strokeColor(colorLineas).lineWidth(0.5).moveTo(isTicket ? 12 : 40, doc.y).lineTo(isTicket ? 214 : 555, doc.y).stroke();
        doc.moveDown(0.5);
        
        doc.fillColor(colorTexto).font('Helvetica-Oblique').fontSize(isTicket ? 7 : 8).text('Este documento es una representación física de una venta interna integrada.', { align: 'center' });
        doc.fillColor(colorSecundario).font('Helvetica-Bold').fontSize(isTicket ? 7.5 : 9).text('¡Gracias por su confianza en CliniCore!', { align: 'center' });

        doc.end();

        writeStream.on('finish', async () => {
          this.logger.log(`💾 PDF guardado en disco: ${rutaCompleta}`);
          const urlPublicaPdf = `/facturas/${nombreArchivo}`;

          try {
            await this.prisma.factura.update({
              where: { ventaId: venta.id },
              data: { urlPdf: urlPublicaPdf }
            });
          } catch (dbError) {
            this.logger.warn(`⚠️ BD no actualizada (Test Manual o Venta Inexistente).`);
          }
          resolve(urlPublicaPdf);
        });

        writeStream.on('error', (error) => {
          this.logger.error(`🚨 Error de stream: ${error.message}`);
          reject(error);
        });

      } catch (err: any) {
        this.logger.error(`🚨 Fallo en maquetación: ${err.message}`);
        reject(err);
      }
    });
  }
}