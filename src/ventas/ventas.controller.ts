import { Controller, Get, Post, Body, Param, Patch, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger'; 
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/anular-venta.dto';
import { CurrentUsuario } from '../common/decorators/user-headers.decorator';
import { IUsuarioCcontext } from '../common/interfaces/user-request.interface';

@ApiTags('Ventas y Operaciones POS')
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // Accionada por el botón de sincronizar del POS
  @Post('sync-productos')
  @ApiOperation({ summary: 'Sincronizar forzadamente el catálogo local de productos consultando al MS de Inventario' })
  async syncProductos() {
    return await this.ventasService.sincronizarProductosDesdeInventario();
  }

  // Accionada automáticamente al cargar el POS (page.tsx:39)
  @Get('productos')
  @ApiOperation({ summary: 'Obtener los productos almacenados localmente para el funcionamiento veloz del POS' })
  async obtenerProductos() {
    return await this.ventasService.obtenerProductosLocales();
  }

  @Post()
  @ApiOperation({ summary: 'Asentar y procesar una nueva orden de venta' })
  create(@Body() createVentaDto: CreateVentaDto, @CurrentUsuario() usuario: IUsuarioCcontext) {
    return this.ventasService.create(createVentaDto, usuario);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las transacciones de venta registradas' })
  findAll() {
    return this.ventasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener la auditoría completa, transacciones y desglose de una venta por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Patch(':id/anular')
  @ApiOperation({ summary: 'Anular una venta activa y revertir de forma segura los saldos y stocks correspondientes' })
  anular(
    @Param('id', ParseIntPipe) id: number, 
    @Body() anularVentaDto: AnularVentaDto,
    @CurrentUsuario() usuario: IUsuarioCcontext 
  ) {
    return this.ventasService.anular(id, anularVentaDto, usuario);
  }
}