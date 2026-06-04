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

  // ✅ UNIFICADO: Sin duplicados, usa tu DTO y ParseIntPipe
  @Patch(':id/anular')
  
  anular(
    
    @Param('id', ParseIntPipe) id: number, 
    @Body() anularVentaDto: AnularVentaDto,
    @CurrentUsuario() usuario: IUsuarioCcontext // 👈 Capturamos el usuario para validar su Rol en el Service
  ) {
    return this.ventasService.anular(id, anularVentaDto, usuario);
  }
}