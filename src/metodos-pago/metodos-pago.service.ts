import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client'; // 👈 Importamos PrismaClient directamente
import { CrearMetodoPagoDto } from './dto/crear-metodo-pago.dto';

@Injectable()
export class MetodosPagoService {
  // 👈 Instanciamos Prisma directamente igual que en VentasService
  private prisma = new PrismaClient(); 

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
      // 🔍 Captura la restricción de integridad referencial (onDelete: Restrict)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'No se puede eliminar este método de pago porque existen registros de ventas o pagos asociados en el historial contable.'
        );
      }
      throw error;
    }
  }
}