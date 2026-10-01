import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service'; // 👈 Inyectamos PrismaService
import { CrearMetodoPagoDto } from './dto/crear-metodo-pago.dto';

@Injectable()
export class MetodosPagoService {
  constructor(private readonly prisma: PrismaService) {} // 👈 Inyección de dependencias

  async crear(dto: CrearMetodoPagoDto) {
    return this.prisma.metodoPago.create({
      data: dto,
    });
  }

  async obtenerTodos() {
    return this.prisma.metodoPago.findMany();
  }

  async eliminar(id: number) {
    try {
      const existe = await this.prisma.metodoPago.findUnique({ where: { id } });
      if (!existe) throw new NotFoundException(`Método de pago con ID ${id} no encontrado.`);

      return await this.prisma.metodoPago.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'No se puede eliminar este método de pago porque existen registros de ventas o pagos asociados en el historial contable.'
        );
      }
      throw error;
    }
  }
}