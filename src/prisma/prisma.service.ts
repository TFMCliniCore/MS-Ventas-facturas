import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.conectarConReintentos();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async conectarConReintentos(maxIntentos = 10, milisegundosEspera = 3000) {
    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        await this.$connect();
        this.logger.log('Conexión a la base de datos establecida con éxito.');
        return;
      } catch (error: any) {
        this.logger.warn(
          `[Intento ${intento}/${maxIntentos}] La base de datos aún no está lista. Reintentando en ${milisegundosEspera / 1000}s...`
        );

        if (intento === maxIntentos) {
          this.logger.error('Se superó el límite de reintentos. No se pudo conectar a la base de datos.');
          throw error;
        }

        // Espera antes del siguiente intento
        await new Promise((resolve) => setTimeout(resolve, milisegundosEspera));
      }
    }
  }
}