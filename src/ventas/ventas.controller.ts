import { Controller, Get, Post, Body, Param, Patch, ParseIntPipe, UseGuards } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/update-venta.dto';
import { CurrentUsuario } from '../common/decorators/user-headers.decorator';
import { IUsuarioCcontext } from '../common/interfaces/user-request.interface';
import { InternalGatewayGuard } from '../common/guards/internal-gateway.guard';

@Controller('ventas')
//@UseGuards(InternalGatewayGuard) 
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}


  // Accionada por el botón de sincronizar del POS
  @Post('sync-productos')
  async syncProductos() {
    return await this.ventasService.sincronizarProductosDesdeInventario();
  }

  // Accionada automáticamente al cargar el POS (page.tsx:39)
  @Get('productos')
  async getProductos() {
    return await this.ventasService.obtenerProductosLocales();
  }

  @Post()
  create(@Body() createVentaDto: CreateVentaDto, @CurrentUsuario() usuario: IUsuarioCcontext) {
    return this.ventasService.create(createVentaDto, usuario);
  }

  @Get()
  findAll() {
    return this.ventasService.findAll();
  }


  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Patch(':id/anular')
  anular(
    @Param('id', ParseIntPipe) id: number, 
    @Body() anularVentaDto: AnularVentaDto,
    @CurrentUsuario() usuario: IUsuarioCcontext 
  ) {
    return this.ventasService.anular(id, anularVentaDto, usuario);
  }
}