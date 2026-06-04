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
  // Ruta sugerida para guardar el logo institucional
  private readonly rutaLogo = path.join(process.cwd(), 'assets', 'clinicore-logo.png');

  constructor() {
    if (!fs.existsSync(this.carpetaAlmacenamiento)) {
      fs.mkdirSync(this.carpetaAlmacenamiento, { recursive: true });
      this.logger.log(`📁 Carpeta de almacenamiento creada en: ${this.carpetaAlmacenamiento}`);
    }
  }

  async generarYGuardarPdf(venta: any, dtoVenta: any): Promise<string> {
  // 1. Extraemos todo del objeto 'venta' que nos llega
  const { codigo, total, subtotal, impuestos, descuento, detalles, pagos, factura } = venta;
  
  // 2. 'detalles' sea un array (por si acaso viene undefined)
  const listaDetalles = detalles || []; 

  const tipo = factura?.tipoComprobante || TipoComprobante.TICKET;
  
  const nombreArchivo = `${codigo}.pdf`;
  const rutaCompleta = path.join(this.carpetaAlmacenamiento, nombreArchivo);
    
    return new Promise((resolve, reject) => {
      try {
        const isTicket = tipo === TipoComprobante.TICKET;
        
        const doc = new PDFDocument({
          size: isTicket ? [226, 650] : 'A4',
          margin: isTicket ? 12 : 40,
        });

        const writeStream = fs.createWriteStream(rutaCompleta);
        doc.pipe(writeStream);

        // --- PALETA DE COLORES (Inspirada en CliniCore) ---
        const colorPrimario = '#00529B';   // Azul Corporativo
        const colorSecundario = '#2E7D32'; // Verde Clínico
        const colorTexto = '#2C3E50';      // Gris Oscuro para lectura suave
        const colorGrisClaro = '#F4F6F9';  // Fondo de tablas
        const colorLineas = '#E2E8F0';     // Divisores sutiles

        // ==========================================
        // 1. ENCABEZADO Y LOGO
        // ==========================================
        if (!isTicket) {
          // --- DISEÑO FORMATO A4 ---
          // 1. Insertar Logo Institucional (Agrandado de 55 a 75)
          if (fs.existsSync(this.rutaLogo)) {
            // Subimos sutilmente el Y a 28 para centrarlo verticalmente con el bloque derecho
            doc.image(this.rutaLogo, 40, 28, { width: 85 });
          } else {
            // Respaldo Vectorial escalado proporcionalmente al nuevo tamaño
            doc.fillColor(colorPrimario).circle(77, 60, 32).fill();
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(28).text('+', 62, 42, { width: 30, align: 'center' });
          }

          // Nombre de la Empresa y Eslogan
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(22).text('CLINICORE S.A.S.', 130, 42);
          doc.fillColor(colorSecundario).font('Helvetica-Oblique').fontSize(9.5).text('Sistemas de Gestión Veterinaria', 130, 66);
          
          // Bloque de Comprobante (Caja derecha flotante)
          doc.fillColor(colorGrisClaro).rect(380, 35, 175, 55).fill();
          doc.strokeColor(colorPrimario).lineWidth(1).rect(380, 35, 175, 55).stroke();
          
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(11).text(tipo, 390, 42, { width: 155, align: 'center' });
          doc.fillColor('#E74C3C').fontSize(11).text(codigo, 390, 56, { width: 155, align: 'center' });
          doc.fillColor(colorTexto).font('Helvetica').fontSize(8).text(`Emisión: ${new Date(venta.fecha).toLocaleString('es-CO')}`, 390, 74, { width: 155, align: 'center' });
          
          doc.moveDown(2.5);
        } else {
          // --- DISEÑO FORMATO TICKET ---
          if (fs.existsSync(this.rutaLogo)) doc.image(this.rutaLogo, 88, 15, { width: 50 });
          doc.moveDown(isTicket ? 5 : 1);
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(12).text('CLINICORE S.A.S.', { align: 'center' });
          doc.fillColor(colorTexto).font('Helvetica').fontSize(8).text('Sistemas de Gestión de Salud', { align: 'center' });
          doc.text(`Sucursal ID: ${venta.sucursalId} | Cajero ID: ${venta.usuarioId}`, { align: 'center' });
          doc.moveDown(0.5);
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(9).text(`${tipo}: ${codigo}`, { align: 'center' });
          doc.fillColor(colorTexto).font('Helvetica').fontSize(8).text(`Fecha: ${new Date(venta.fecha).toLocaleString('es-CO')}`, { align: 'center' });
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
        
        if (venta.clienteId && !dtoVenta.identificacionCliente) {
          doc.text(`ID Cliente Core: ${venta.clienteId}`);
        } else if (dtoVenta.identificacionCliente) {
          doc.text(`Cliente / Paciente: ${dtoVenta.nombreCliente || 'Particular'}`);
          doc.text(`Documento: (${dtoVenta.tipoDocumento || 'CC'}) ${dtoVenta.identificacionCliente}`);
        } else {
          doc.text('Cliente: Consumidor Final');
        }
        
        doc.text(`Sucursal Origen: Módulo Principal (ID ${venta.sucursalId || 1})`);
        separarSeccion();
        doc.moveDown(0.5);

        // ==========================================
        // 3. TABLA DE PRODUCTOS (Detalles)
        // ==========================================
        if (!isTicket) {
          // --- TABLA ESTRUCTURADA PARA A4 ---
          let yTabla = doc.y;
          
          // Encabezado con Fondo de Color
          doc.fillColor(colorPrimario).rect(40, yTabla, 515, 22).fill();
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
          
          doc.text('DESCRIPCIÓN DEL ARTÍCULO / PRODUCTO', 50, yTabla + 6, { width: 230 });
          doc.text('CANT.', 290, yTabla + 6, { width: 50, align: 'center' });
          doc.text('P. UNITARIO', 350, yTabla + 6, { width: 90, align: 'right' });
          doc.text('TOTAL NETO', 450, yTabla + 6, { width: 95, align: 'right' });
          
          yTabla += 22;
          doc.font('Helvetica').fontSize(9).fillColor(colorTexto);

          // Filas Dinámicas Alternas
            listaDetalles.forEach((det: any, index: number) => {
              // 1. Fondo cebra
              if (index % 2 === 1) {
                doc.fillColor(colorGrisClaro).rect(40, yTabla, 515, 20).fill();
              }
              
              doc.fillColor(colorTexto);

              // 2. Datos seguros
              const prodId = det.productoId ?? 'N/A';
              const cant = det.cantidad ?? 0;
              const precio = Number(det.precioUnitario) || 0;
              const subtotal = Number(det.subtotal) || 0;

              // 3. Dibujar textos
              doc.text(`Producto Código ID: ${prodId}`, 50, yTabla + 5, { width: 230 });
              doc.text(`${cant}`, 290, yTabla + 5, { width: 50, align: 'center' });
              doc.text(`$${precio.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, 350, yTabla + 5, { width: 90, align: 'right' });
              doc.text(`$${subtotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, 450, yTabla + 5, { width: 95, align: 'right' });

              // 👇 ¡ESTO ES LO QUE FALTABA!
              // Línea de división inferior para separar productos
              doc.strokeColor(colorLineas).lineWidth(0.5).moveTo(40, yTabla + 20).lineTo(555, yTabla + 20).stroke();
              
              // Mover el cursor hacia abajo para el siguiente producto
              yTabla += 20;
            });

            // Actualizar el cursor del documento después del ciclo
            doc.y = yTabla + 10;
          
          doc.y = yTabla + 10;
        } else {        
        // --- ENFOQUE COMPACTO PARA TICKET ---
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(8).text('ARTÍCULO               CANT    P.UNIT     TOTAL');
          doc.strokeColor(colorTexto).lineWidth(0.5).moveTo(12, doc.y).lineTo(214, doc.y).stroke();
          doc.moveDown(0.2);
          
          doc.font('Helvetica').fontSize(7).fillColor(colorTexto);
          
          // ✅ CAMBIAR 'detalles.forEach' POR 'listaDetalles.forEach'
          listaDetalles.forEach((det: any) => {
            const idStr = `ID: ${det.productoId}`.padEnd(18, ' ');
            const cantStr = `${det.cantidad}`.padEnd(6, ' ');
            const precioStr = `$${Number(det.precioUnitario).toFixed(0)}`.padEnd(10, ' ');
            const totalStr = `$${Number(det.subtotal).toFixed(0)}`;
            doc.text(`${idStr}${cantStr}${precioStr}${totalStr}`);
          });
          doc.moveDown(0.5);
        }

        // ==========================================
        // 4. SECCIÓN DE TOTALES Y PAGOS
        // ==========================================
        if (!isTicket) {
          // En A4, dividimos el espacio inferior en dos columnas colindantes
          const yTotalesBase = doc.y;
          
          // Columna Izquierda: Formas de Pago
          doc.fillColor(colorPrimario).font('Helvetica-Bold').fontSize(10).text('FORMAS DE PAGO:', 40, yTotalesBase);
          doc.font('Helvetica').fontSize(9).fillColor(colorTexto);
          let yPagos = yTotalesBase + 15;
          
          pagos.forEach((p: any) => {
            doc.text(`• Método [ID ${p.metodoPagoId}]: $${Number(p.monto).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, 40, yPagos);
            if (p.referencia) {
              yPagos += 12;
              doc.fillColor(colorSecundario).font('Helvetica-Oblique').fontSize(8).text(`  Ref: ${p.referencia}`, 40, yPagos).font('Helvetica').fontSize(9);
            }
            yPagos += 15;
          });

          // Columna Derecha: Liquidación Financiera
          const xBloqueTotales = 360;
          let yTotales = yTotalesBase;
          
          const alinearTotal = (etiqueta: string, valor: number, esNegrita = false, esDescuento = false) => {
            doc.fillColor(esNegrita ? colorPrimario : colorTexto).font(esNegrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(esNegrita ? 11 : 9);
            doc.text(etiqueta, xBloqueTotales, yTotales, { width: 100 });
            
            const prefijo = esDescuento ? '-$' : '$';
            doc.text(`${prefijo}${Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, xBloqueTotales + 100, yTotales, { width: 95, align: 'right' });
            yTotales += 18;
          };

          alinearTotal('Subtotal:', subtotal);
          if (Number(descuento) > 0) alinearTotal('Descuento:', descuento, false, true);
          alinearTotal('IVA (15%):', impuestos);
          
          // Línea divisoria antes del total absoluto
          doc.strokeColor(colorPrimario).lineWidth(1).moveTo(xBloqueTotales, yTotales).lineTo(555, yTotales || yTotales).stroke();
          yTotales += 5;
          alinearTotal('TOTAL A PAGAR:', total, true);
          
          doc.y = Math.max(yPagos, yTotales) + 20;
        } else {
          // Liquidación en formato Ticket
          doc.font('Helvetica').fontSize(8);
          doc.text(`Subtotal: $${Number(subtotal).toFixed(2)}`, { align: 'right' });
          if (Number(descuento) > 0) doc.text(`Descuento: -$${Number(descuento).toFixed(2)}`, { align: 'right' });
          doc.text(`IVA (15%): $${Number(impuestos).toFixed(2)}`, { align: 'right' });
          doc.font('Helvetica-Bold').fontSize(10).text(`TOTAL: $${Number(total).toFixed(2)}`, { align: 'right' });
          
          doc.moveDown(0.5);
          doc.font('Helvetica-Bold').fontSize(8).text('FORMAS DE PAGO:');
          doc.font('Helvetica').fontSize(7);
          pagos.forEach((p: any) => {
            doc.text(`- ID ${p.metodoPagoId}: $${Number(p.monto).toFixed(2)} ${p.referencia ? `(${p.referencia})` : ''}`);
          });
          doc.moveDown(1);
        }

        // ==========================================
        // 5. PIE DE PÁGINA
        // ==========================================
        doc.fillColor(colorTexto).font('Helvetica-Oblique').fontSize(isTicket ? 7 : 8).text('Este documento es una representación física de una venta interna integrada.', { align: 'center' });
        doc.fillColor(colorSecundario).font('Helvetica-Bold').text('¡Gracias por su confianza en CliniCore!', { align: 'center' });

        doc.end();

        // Guardado de la URL del archivo
        writeStream.on('finish', async () => {
          this.logger.log(`💾 PDF corporativo guardado en disco: ${rutaCompleta}`);
          const urlPublicaPdf = `/facturas/${nombreArchivo}`;

          try {
            await this.prisma.factura.update({
              where: { ventaId: venta.id },
              data: { urlPdf: urlPublicaPdf }
            });
            this.logger.log(`🔗 Campo 'urlPdf' actualizado en BD para la venta: ${codigo}`);
          } catch (dbError) {
            this.logger.warn(`⚠️ No se actualizó la BD (Modo Test Manual / ID Inexistente).`);
          }
          resolve(urlPublicaPdf);
        });

        writeStream.on('error', (error) => {
          this.logger.error(`🚨 Error escribiendo el stream del PDF: ${error.message}`);
          reject(error);
        });

      } catch (err: any) {
        const mensajeError = err instanceof Error ? err.message : String(err);
        this.logger.error(`🚨 Fallo en la maquetación del PDF: ${mensajeError}`);
        reject(err);
      }
    });
  }
}